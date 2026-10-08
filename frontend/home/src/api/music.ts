import { apiGet } from './client'

/**
 * 音乐歌单（后端 /api/music/*，数据源是站长配置的网易云公开歌单）。
 * 端点、参数与类型同处一个资源模块，类型以 server/vo/music.vo.js 为基准。
 */

export interface MusicAlbum {
  id: number | null
  name: string | null
  /** 封面（https，已带 300px 尺寸参数）；取不到时为 null，消费方自行回退 */
  cover: string | null
}

export interface MusicTrack {
  id: number
  name: string
  artists: string[]
  album: MusicAlbum
  durationMs: number
  trackNo: number
  /** 网易云的付费标记原值（0 免费 / 1 VIP / 8 低音质免费档）。
   *  **不是能不能播的判据** —— 一律以 getTrackStream 的 playable 为准 */
  fee: number
}

export interface MusicPlaylist {
  id: number
  name: string
  cover: string | null
  trackCount: number
  updatedAt: number | null
  tracks: MusicTrack[]
}

/**
 * 直链解析结果。
 * 可播时给 url 与 expiresAt（epoch ms，网易云直链 20 分钟过期，到点要重新解析）；
 * 不可播是**正常状态**（200）：reason 为 vip / region / unknown，界面据此标注并跳下一首。
 */
export type TrackStream =
  | { playable: true; url: string; expiresAt: number; br: number; level: string; type: string }
  | { playable: false; reason: 'vip' | 'region' | 'unknown' }

/** 歌单（含全部曲目）：播放器队列与将来「音像店」的货架数据共用这一个接口 */
export function getMusicPlaylists() {
  return apiGet<{ playlists: MusicPlaylist[] }>('/music/playlists')
}

/** 逐曲直链：只对配置歌单内的曲目放行（后端白名单），其余回 404 */
export function getTrackStream(trackId: number) {
  return apiGet<TrackStream>(`/music/tracks/${trackId}/url`)
}
