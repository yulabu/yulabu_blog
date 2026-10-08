// 音乐歌单的出参形状（唯一出处）。

// 曲目：刻意只透出前端要用的字段。网易云的单首曲目有 50+ 字段，全量下发既喂大响应，
// 又把它的内部枚举泄漏成我们的契约。
// fee 是例外（前端据此提示「这首可能需要 VIP」），但**它不是能不能播的判据**——
// 一律以 tracks/:id/url 的实际解析结果 playable 为准（实测 fee=8 的曲目未登录也能正常播放）。
function trackVO(track) {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists,
    album: track.album,
    durationMs: track.durationMs,
    trackNo: track.trackNo,
    fee: track.fee
  };
}

function playlistVO(playlist) {
  return {
    id: playlist.id,
    name: playlist.name,
    cover: playlist.cover,
    trackCount: playlist.trackCount,
    updatedAt: playlist.updatedAt,
    tracks: playlist.tracks.map(trackVO)
  };
}

// playlists 是**数组**（当前长度 1，来自 NETEASE_PLAYLIST_IDS）：给「音像店」的多货架留的口子，
// 将来多配几个歌单不用改契约
function playlistsVO(playlists) {
  return { playlists: playlists.map(playlistVO) };
}

// 直链：可播 → 地址 + 过期时刻（epoch ms）；不可播 → playable:false + 原因（200，不是错误——
// 「这首歌当前听不了」是正常状态，前端要据此标注并跳下一首）
function trackStreamVO(stream) {
  if (!stream.playable) return { playable: false, reason: stream.reason };
  return {
    playable: true,
    url: stream.url,
    expiresAt: stream.expiresAt,
    br: stream.br,
    level: stream.level,
    type: stream.type
  };
}

module.exports = { playlistsVO, trackStreamVO };
