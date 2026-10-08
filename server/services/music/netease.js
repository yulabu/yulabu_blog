// 网易云适配器 —— **全项目唯一认识网易云的地方**：协议、cookie、X-Real-IP、字段名都锁在这个文件。
// 接口变更、地区策略调整、或改走自建 NeteaseCloudMusicApi 实例（NETEASE_API_BASE），都只改这里，
// 上层（services/music/index.js）只认下面这几个函数与它们的返回形状。
//
// 协议事实（2026-10-08 实测，证据见 .zcode/plans/plan-music-playlist.md）：
//   · 公开歌单元数据匿名可读：GET /api/v6/playlist/detail?id=<id>&n=1000&s=8（n 上限 1000 首）
//   · 播放直链：POST /api/song/enhance/player/url，表单 ids=[<id>]&br=<码率>
//   · 直链带 20 分钟时效（响应 expi=1200），返回 http:// 形式，**必须升级成 https**
//     —— 本站是 HTTPS，http 的音频/封面会被浏览器按混合内容规则静默拦掉（实测 https 可用）
//   · 地区校验只看 X-Real-IP 头且只认大陆 IP（本服务器在境外，裸请求对版权曲目一律 404）；
//     该头是网易云自己 App 用来上报客户端真实 IP 的字段，取值策略在 services/music/index.js
//   · VIP / 版权受限曲目的 url 为 null —— **是正常状态不是故障**，必须显式区分（见 unplayableReason）
//
// 刻意不做的两件事：
//   · 不代理音频：直链 CDN 支持 Range、无 Referer 校验、还带 CORS 头，访客浏览器直连即可
//     （服务器在境外，代理等于让每个字节跨洋绕我们一圈）
//   · 不下载封面：图片同样直连 CDN，只把地址升级成 https 并索要 300px 尺寸
const { apiBase, cookie } = require('@config/music');
const { warnTagLine } = require('@utils/log');

const TIMEOUT_MS = 8000;
// 响应体积上限：1000 首歌单的原始响应约 500KB；2MB 是「要么不是歌单，要么有人在喂大文件」的界线
const MAX_BODY_BYTES = 2 * 1024 * 1024;
// 音质档：320k mp3（exhigh）。免费曲目未登录即可拿到（实测），想要无损改这里（需 SVIP 账号 + cookie）
const BITRATE = 320000;
// 网易云歌单接口的曲目上限（超过就只回前 1000 首；trackCount 会大于实际返回数）
const MAX_TRACKS = 1000;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 请求头：appver 是网易云认的客户端版本（实测裸请求也通，带上更接近官方客户端）；
// cookie 配了才拼（值形如 `MUSIC_U=xxx; __csrf=yyy`，见 config/env.js）
function baseHeaders() {
  const jar = ['appver=8.9.70'];
  if (cookie) jar.push(cookie);
  return {
    'User-Agent': UA,
    Referer: 'https://music.163.com/',
    Cookie: jar.join('; ')
  };
}

// 读 body 并限制体积（不把未知大小的响应整块读进内存；与 services/ogImage.js 同一手法）
async function readJsonLimited(res) {
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      throw new Error(`响应超过 ${Math.round(MAX_BODY_BYTES / 1024)}KB`);
    }
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('响应不是合法 JSON');
  }
}

// 发一次请求并解析 JSON。失败一律抛 Error（带人话原因）——由调用方决定降级与日志口径：
// 没有缓存可用时转成 503，有旧缓存就用旧的（见 services/music/index.js）
async function request(path, { method = 'GET', body, headers } = {}) {
  let res;
  try {
    res = await fetch(`${apiBase}${path}`, {
      method,
      headers: { ...baseHeaders(), ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...headers },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (err) {
    const timeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    throw new Error(timeout ? `请求超时（${TIMEOUT_MS}ms）` : `请求失败：${err.message}`);
  }
  if (!res.ok) throw new Error(`上游返回 HTTP ${res.status}`);
  return readJsonLimited(res);
}

// http → https（音频与封面都要过这一道，否则被混合内容规则拦掉）
function httpsUrl(url) {
  if (!url) return null;
  return String(url).replace(/^http:\/\//, 'https://');
}

// 封面：升级 https 并索要小尺寸。播放器与将来的音像店都只展示几百像素，原图动辄上百 KB，
// 让访客为了 64px 的封面下原图不值（CDN 支持 ?param=WxH，已有 query 的不动）
function coverUrl(picUrl) {
  const url = httpsUrl(picUrl);
  if (!url) return null;
  return url.includes('?') ? url : `${url}?param=300y300`;
}

// 网易云的曲目 → 我们的领域形状（它的字段名到此为止，别泄漏到上层）
function toTrack(raw) {
  return {
    id: raw.id,
    name: raw.name,
    artists: (raw.ar || []).map((artist) => artist.name),
    album: {
      id: raw.al?.id ?? null,
      name: raw.al?.name ?? null,
      cover: coverUrl(raw.al?.picUrl)
    },
    durationMs: raw.dt || 0,
    trackNo: raw.no || 0,
    // 0 = 免费；1 = VIP；8 = 低音质免费档 —— 只透传原值，播放能力一律以实际解析结果为准
    // （实测 fee=8 在未登录时也能拿到 320k，前端不要拿它当「不能播」的判据）
    fee: raw.fee ?? 0
  };
}

// 取歌单（含全部曲目）。匿名即可读公开歌单；私有歌单要靠 cookie 配的 MUSIC_U
async function fetchPlaylist(playlistId) {
  const data = await request(`/api/v6/playlist/detail?id=${playlistId}&n=${MAX_TRACKS}&s=8`);
  const playlist = data && data.playlist;
  if (!playlist) throw new Error(`歌单不可读（code=${data && data.code}）`);

  const tracks = (playlist.tracks || []).map(toTrack);
  if (playlist.trackCount > MAX_TRACKS) {
    // 只提示不报错：前 1000 首照常可用
    console.warn(warnTagLine('music', `歌单 ${playlistId} 共 ${playlist.trackCount} 首，超过单次上限 ${MAX_TRACKS}，本次只取到前 ${MAX_TRACKS} 首`));
  }
  return {
    id: playlist.id,
    name: playlist.name,
    cover: coverUrl(playlist.coverImgUrl),
    trackCount: playlist.trackCount || tracks.length,
    updatedAt: playlist.trackUpdateTime || playlist.updateTime || null,
    tracks
  };
}

// 不可播的原因归类：
//   vip     —— 需要 VIP / 未登录（-110），**与地区无关**，可缓存
//   region  —— 地区或版权限制（404 / cannotListenReason），换一个大陆访客就能播，**不可缓存**
//   unknown —— 其余（下架等），保守起见也不缓存
function unplayableReason(item) {
  if (item.code === -110) return 'vip';
  if (item.code === 404 || item.freeTrialPrivilege?.cannotListenReason != null) return 'region';
  return 'unknown';
}

// 解析单曲直链。返回判别联合：
//   { playable: true,  url, br, level, type, expiresAt }  expiresAt 是 epoch ms（前端与缓存都按它算过期）
//   { playable: false, reason }                          曲目本身不可播（正常状态，不是错误）
// 网络/协议层面的失败照旧抛 Error，由调用方决定降级
async function fetchTrackUrl(trackId, { realIp } = {}) {
  const data = await request('/api/song/enhance/player/url', {
    method: 'POST',
    body: `ids=[${trackId}]&br=${BITRATE}`,
    headers: realIp ? { 'X-Real-IP': realIp } : {}
  });
  const item = data && Array.isArray(data.data) ? data.data[0] : null;
  if (!item) throw new Error(`响应缺少曲目数据（code=${data && data.code}）`);

  if (!item.url) return { playable: false, reason: unplayableReason(item) };

  const expiSeconds = Number(item.expi) || 1200;
  return {
    playable: true,
    url: httpsUrl(item.url),
    br: item.br,
    level: item.level,
    type: item.type,
    expiresAt: Date.now() + expiSeconds * 1000
  };
}

module.exports = { fetchPlaylist, fetchTrackUrl, httpsUrl, MAX_TRACKS };
