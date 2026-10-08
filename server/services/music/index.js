// 音乐歌单域：缓存、白名单守卫与降级策略（数据源在 ./netease，出参组装在 vo/music.vo.js）。
//
// 这个文件回答三个问题：
//   ① 什么时候去问网易云（缓存 TTL 与 SWR）
//   ② 谁可以要求解析直链（白名单守卫）
//   ③ 上游不可用时怎么退化（旧数据继续用 / 503，前端再退到本地曲目）
//
// 缓存全在进程内存里（不做 DB 表、不加定时任务）：数据本身是可再生的外部内容，
// 重启后第一个访客多等一次取数即可，不值得为它引入生产库变更与一套失效逻辑。
const { playlistIds, regionIp } = require('@config/music');
const { fetchPlaylist, fetchTrackUrl } = require('./netease');
const { warnTagLine } = require('@utils/log');
const AppError = require('@errors/AppError');

// 内部实现常量（外部定不了 → 不进 config/，判据见 AGENTS.md「config/ 的职责边界」）
//
// 歌单内容的新鲜度：60s。改前是 10 分钟 + SWR（先给旧数据、后台再刷），实测站长改了歌单页面
// 要等两轮才认（过期点那一次请求发的仍是旧列表）。现在**过期就阻塞着取回来**，最坏滞后 1 分钟；
// 代价只是触发刷新的那个访客多等约 0.5s（播放器本来就显示转圈），取不到时退回旧数据
const PLAYLIST_TTL_MS = 60 * 1000;
const VIP_TTL_MS = 10 * 60 * 1000;
// 直链缓存留的余量：网易云的 expi 是「从现在起 20 分钟」，贴着边界用容易在播到一半时失效
const URL_SAFETY_MARGIN_MS = 60 * 1000;

const playlistCache = new Map();    // 歌单 id → { data, trackIds: Set, at }
const playlistInflight = new Map(); // 歌单 id → 进行中的刷新（单飞：并发请求共享同一趟上游取数）
const urlCache = new Map();         // 曲目 id → { url, br, level, type, expiresAt }
const vipCache = new Map();         // 曲目 id → { reason, at }，只缓存「与地区无关」的不可播结论

function storePlaylist(id, data) {
  const entry = {
    data,
    // 白名单守卫用的是这张 id 集合，随歌单数据一起换
    trackIds: new Set(data.tracks.map((track) => track.id)),
    at: Date.now()
  };
  playlistCache.set(id, entry);
  return entry;
}

// 刷新歌单（单飞）：同一时刻只向网易云发一次，并发请求共享同一个 promise。
// 失败**不抛**——退回调用方手上的旧数据 + 记一行 warn：歌单是可再生的外部内容，
// 上游抖动不该让播放器变砖（与降级策略一致）
function refreshPlaylist(id, stale) {
  const inflight = playlistInflight.get(id);
  if (inflight) return inflight;

  const task = fetchPlaylist(id)
    .then((data) => storePlaylist(id, data).data)
    .catch((err) => {
      console.warn(warnTagLine('music', `歌单 ${id} 刷新失败，继续用旧数据：${err.message}`));
      return stale.data;
    })
    .finally(() => playlistInflight.delete(id));

  playlistInflight.set(id, task);
  return task;
}

async function loadPlaylist(id) {
  const cached = playlistCache.get(id);
  if (!cached) {
    // 冷启动（进程刚起来 / 刚加歌单）：本次请求同步等一次取数（实测约 1s）
    return storePlaylist(id, await fetchPlaylist(id)).data;
  }
  if (Date.now() - cached.at <= PLAYLIST_TTL_MS) return cached.data;
  return refreshPlaylist(id, cached);
}

// 全部配置歌单（含曲目）。未配置时返回空数组（不是错误）：前端据此退化为本地默认曲目。
// 单个歌单失败不拖垮其它歌单；**一个都取不到且没有任何缓存**才 503
async function getPlaylists() {
  if (!playlistIds.length) return [];

  const result = [];
  for (const id of playlistIds) {
    try {
      result.push(await loadPlaylist(id));
    } catch (err) {
      console.warn(warnTagLine('music', `歌单 ${id} 取数失败：${err.message}`));
    }
  }
  if (!result.length) throw new AppError(503, '音乐歌单暂时不可用，请稍后再试');
  return result;
}

// X-Real-IP 的取值：网易云按它判地区，本服务器在境外，所以默认转发访客真实 IP
// （大陆访客天然通过；这是网易云自己 App 上报客户端 IP 的字段，属于如实转达）。
// 回环/私网地址一律不发——对网易云没有意义，只会白得一个 404（本机 curl 调试即此情形）。
// realIp 是显式指定（scripts/music.js 排查用），regionIp 是配置里的固定值（可选旋钮）。
const PRIVATE_IP_RE = /^(?:10\.|127\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/;

function realIpFor({ clientIp, realIp } = {}) {
  if (realIp) return realIp;
  if (regionIp) return regionIp;
  const ip = String(clientIp || '').replace(/^::ffff:/, '');
  if (!ip || ip === '::1' || ip === 'localhost' || PRIVATE_IP_RE.test(ip)) return '';
  return ip;
}

// 白名单守卫的数据源：曲目 id 是否属于**任一配置歌单**（id 集合与歌单缓存同生共死）。
// 调用方（getTrackStream）已经先跑过 getPlaylists —— 配置里的歌单要么已在缓存里，要么那一步就 503 了；
// config 在进程内是冻结的，缓存里不会留「已取消配置」的歌单
function isMemberOfAnyPlaylist(trackId) {
  for (const entry of playlistCache.values()) {
    if (entry.trackIds.has(trackId)) return true;
  }
  return false;
}

// 解析单曲直链（带缓存）。返回值直接就是 vo/music.vo.js 的输入：
//   { playable: true, url, expiresAt, br, level, type } | { playable: false, reason }
async function getTrackStream(trackId, options = {}) {
  // 歌单是白名单的来源，必须先就位（未配置时返回空数组，那就谁都不放行）
  await getPlaylists();

  // 白名单守卫：只解析「配置歌单里确实存在的曲目」。没有这道守卫，这个接口就是一个公开的
  // 网易云直链代理——任何人都能拿它刷任意曲目 id，烧掉本机 IP 的配额、把服务器打进风控
  if (!isMemberOfAnyPlaylist(trackId)) throw new AppError(404, '曲目不在歌单中');

  const cached = urlCache.get(trackId);
  if (cached && cached.expiresAt - URL_SAFETY_MARGIN_MS > Date.now()) return cached;

  const negative = vipCache.get(trackId);
  if (negative && Date.now() - negative.at < VIP_TTL_MS) {
    return { playable: false, reason: negative.reason };
  }

  const stream = await fetchTrackUrl(trackId, { realIp: realIpFor(options) });
  if (stream.playable) {
    urlCache.set(trackId, stream);
  } else if (stream.reason === 'vip') {
    // 只缓存「与地区无关」的不可播结论（需要 VIP 是账号级的）。地区型/未知失败不缓存——
    // 否则一个海外访客的首访会把大陆访客的解析结果污染成「不可播」，且 10 分钟内无法自愈
    vipCache.set(trackId, { reason: stream.reason, at: Date.now() });
  }
  return stream;
}

module.exports = { getPlaylists, getTrackStream };
