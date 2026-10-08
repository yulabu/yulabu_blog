// 音乐歌单的配置——config/ 的「运维经 env 定」半边（config/env.js 的原始值 → 可用值）。
//
// 这里只做派生：ID 列表解析、空值归一、根地址去尾斜杠。**TTL / 音质档 / 超时这些内部实现常量
// 刻意不进来**——它们随代码走，外部定不了（判据见 AGENTS.md「config/ 的职责边界」），
// 都在 services/music/ 的文件顶部。
//
// 各字段的语义与取值方式见 env.js 的注释与 .env_example。
const env = require('@config/env');

// 逗号分隔的歌单 ID；非法段直接丢弃（配置写错不该让进程起不来，最多是少一个歌单）
function parsePlaylistIds(raw) {
  return String(raw || '')
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
}

module.exports = {
  // 空数组 = 音乐功能关闭：/api/music/playlists 返回空列表，前端播放器退化为本地默认曲目
  playlistIds: parsePlaylistIds(env.music.playlistIds),
  cookie: env.music.cookie || '',
  apiBase: env.music.apiBase.replace(/\/+$/, ''),
  // 空串 = 转发访客真实 IP（默认）；填了就是固定值（见 services/music/index.js 的 realIpFor）
  regionIp: env.music.regionIp || ''
};
