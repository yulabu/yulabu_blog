const { trackIdDTO } = require('@dto/music.dto');
const { playlistsVO, trackStreamVO } = require('@vo/music.vo');
// 取数与缓存都在 service：网易云是不可控的外部依赖，「怎么缓存、失败怎么降级」属领域能力
const { getPlaylists, getTrackStream } = require('@services/music');

// 歌单（含全部曲目）：前台播放器的队列来源，也是将来「音像店」的货架数据
exports.getPlaylists = async (req, res) => {
  res.json(playlistsVO(await getPlaylists()));
};

// 逐曲直链。X-Real-IP 要转发访客真实 IP：本服务器在境外，网易云按解析请求的 IP 判地区，
// 不转发的话版权曲目对所有人都是「不可播」（详见 services/music/netease.js 顶部说明）
exports.getTrackStream = async (req, res) => {
  const trackId = trackIdDTO(req.params);

  res.json(trackStreamVO(await getTrackStream(trackId, { clientIp: req.ip })));
};
