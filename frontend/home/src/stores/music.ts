import { ref, computed, reactive } from 'vue'
import { getMusicPlaylists, getTrackStream, type MusicTrack } from '@/api/music'
import { useToast } from '@/stores/toast'
import defaultCoverMeta from '@/assets/img/music_player.webp'
import defaultSrc from '@/assets/music/我爱你 - nxd.mp3'

export interface Track {
  id: string
  title: string
  artist: string
  /** 播放地址。null = 还没解析（网易云曲目按需解析直链，解析成功才填上） */
  src: string | null
  cover: string
  /** 网易云 song id —— 「音像店」按 id 点播的入口（playTrack）；本地降级曲目没有它 */
  remoteId?: number
  /** 直链过期时刻（epoch ms）。网易云直链 20 分钟失效，到点重新解析 */
  srcExpiresAt?: number
  /** 时长（毫秒）。网易云曲目自带，未加载元数据前也能显示正确时长 */
  durationMs?: number
  /** 解析判定为不可播（VIP / 版权 / 地区）——界面据此标注，本轮不再反复试 */
  unavailable?: boolean
}

// 本地默认曲目：**降级曲目**。歌单取数失败（后端挂了 / 未配歌单）时播放器就播它，
// 与改造前行为完全一致——播放器不会因为外部内容不可用而变砖
const defaultTrack: Track = {
  id: 'local:1',
  title: '我爱你',
  artist: '纳西妲 · Yulabu playlist',
  src: defaultSrc,
  cover: defaultCoverMeta.src,
}

/**
 * 播放器状态：**模块级单例**（改前是 pinia store）。
 *
 * 为什么不用 pinia：岛上每个 Vue app 各注一份 pinia，跨岛不同步（见 AGENTS.md「跨岛状态」），
 * 而 music 只有一个消费方（MusicPlayer 岛）——pinia 的价值为 0，代价是要为它挂
 * `_vue-flags` 全局与 vite.ssr.noExternal 两处特例。模块单例是同一份 ESM 模块图，
 * 语义更直接。
 *
 * 返回 reactive 包装：模板里写 musicStore.isPlaying 不需要 .value（与 pinia 的用法一致）
 */
const playlist = ref<Track[]>([defaultTrack])
const currentIndex = ref(0)
const currentTrack = computed(() => playlist.value[currentIndex.value] ?? defaultTrack)

/** 歌单取数状态：idle = 还没取（或后端未配歌单）/ loading / ready / error（继续用本地曲目） */
const playlistState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(16)
const loadedIndex = ref(-1)

const progress = computed(() => (currentTime.value / duration.value) * 100 || 0)

/**
 * Audio 惰性创建：本模块会被 SSR 包求值（Layout → MusicPlayer → 这里），
 * 模块顶层 `new Audio()` 在 Node 里会直接 ReferenceError。
 * 顺带保住「不在初始化时 load」的既有优化：preload='none'，首次播放才真正拉音源。
 */
let audio: HTMLAudioElement | null = null

function getAudio(): HTMLAudioElement {
  if (audio) return audio

  audio = new Audio()
  audio.preload = 'none'
  audio.volume = volume.value / 100
  audio.addEventListener('timeupdate', () => {
    currentTime.value = audio!.currentTime
  })
  audio.addEventListener('loadedmetadata', () => {
    duration.value = audio!.duration
  })
  audio.addEventListener('ended', () => next())
  audio.addEventListener('error', onAudioError)
  return audio
}

// ============ 歌单取数（网易云） ============

/**
 * 未加载音频时用曲目自带的时长占位（网易云曲目都带 dt）。
 * 不这么做的话，没按下播放前时长显示 0:00，与右侧已经知道的总长对不上。
 * 已加载的曲目不动：真实时长以 loadedmetadata 为准（比 dt 略准）
 */
function showTrackDuration(track: Track | undefined) {
  if (track?.durationMs) duration.value = track.durationMs / 1000
}

function toTrack(track: MusicTrack): Track {
  return {
    id: `ne:${track.id}`,
    remoteId: track.id,
    title: track.name,
    artist: track.artists.join(' / '),
    src: null,
    cover: track.album.cover || defaultCoverMeta.src,
    durationMs: track.durationMs,
  }
}

let loadPromise: Promise<void> | null = null
/** 队列的加载时刻：超过 CLIENT_PLAYLIST_TTL_MS 后，下次展开/播放会静默重拉一次歌单 */
let playlistLoadedAt = 0
/**
 * 客户端侧的队列新鲜度：5 分钟。
 * 服务端 60s 就能拿到新歌单，但一个页面里的队列只在加载时取一次 —— 长开着的标签页
 * （软导航也因为播放器 persist 而不重建）会一直用旧队列。超过这个时长后，下一次
 * 「展开播放器 / 按下播放」会静默重拉并原地换队列（不闪转圈、不打断播放）。
 */
const CLIENT_PLAYLIST_TTL_MS = 5 * 60 * 1000

/**
 * 用远端曲目重建播放队列。**正在播的那一首始终留在原位**（它要对上音频与标签）：
 *   · 仍在歌单里 → 用它在歌单里的新位置（队列顺序以远端为准），并把它已解析的直链带过去
 *   · 已被移出歌单 → 留在队首（不打断当前播放，下一首再走歌单）
 * 没有在播的曲目时整列替换。
 */
function applyRemoteQueue(remote: Track[]) {
  const playing = loadedIndex.value >= 0 ? playlist.value[loadedIndex.value] : null
  if (!playing) {
    playlist.value = remote
    currentIndex.value = 0
    showTrackDuration(remote[0])
    return
  }

  const fresh = playing.remoteId != null ? remote.findIndex((track) => track.remoteId === playing.remoteId) : -1
  if (fresh >= 0) {
    // 直链与「不可播」标记沿用旧的：正在播的那首不该被重置成待解析
    remote[fresh] = {
      ...remote[fresh],
      src: playing.src,
      srcExpiresAt: playing.srcExpiresAt,
      unavailable: playing.unavailable,
    }
    playlist.value = remote
    currentIndex.value = fresh
    loadedIndex.value = fresh
    return
  }

  playlist.value = [playing, ...remote]
  currentIndex.value = 0
  loadedIndex.value = 0
}

/**
 * 取歌单并换成播放队列（**幂等 + 单飞**：展开面板、首次播放、音像店点播都会调它，
 * 只会有一次请求）。失败不抛、只记一行 warn：播放器继续用当前队列（或本地降级曲目）。
 *
 * 调用时机刻意是「用户有交互」——展开播放器或按下播放/收起条，不在挂载时请求，
 * 与既有的 `preload='none'`（首次播放才拉音源）同一条纪律：首屏零请求。
 */
function loadPlaylists(): Promise<void> {
  // 已经拿到歌单：只有放久了才静默换一份新的（长开的标签页也能跟上歌单改动）
  const refreshing = playlistState.value === 'ready'
  if (refreshing && Date.now() - playlistLoadedAt < CLIENT_PLAYLIST_TTL_MS) return Promise.resolve()
  if (loadPromise) return loadPromise

  // 首次加载才进 loading（播放按钮转圈）；原地刷新是静默的，失败也不改状态
  if (!refreshing) playlistState.value = 'loading'

  loadPromise = (async () => {
    try {
      const { playlists } = await getMusicPlaylists()
      const remote = playlists.flatMap((playlist) => playlist.tracks).map(toTrack)
      if (!remote.length) {
        // 未配置歌单或歌单是空的：后端返回空列表是正常状态，不报错、保持现状
        if (!refreshing) playlistState.value = 'idle'
        return
      }
      applyRemoteQueue(remote)
      playlistLoadedAt = Date.now()
      playlistState.value = 'ready'
    } catch (err) {
      console.warn('[music] 歌单取数失败，播放器继续用当前队列', err)
      if (!refreshing) playlistState.value = 'error'
    } finally {
      loadPromise = null
    }
  })()

  return loadPromise
}

// ============ 播放（直链按需解析） ============

type LoadResult = 'ok' | 'unavailable' | 'error'

/**
 * 确保曲目的 src 可用（网易云曲目惰性解析直链，过期则重解析）。
 * 'unavailable' = 这首确实播不了（VIP/版权/地区）；'error' = 这次没拿到（网络/后端），
 * 两者必须分开——前者标注并跳下一首，后者不该把歌标成不可播。
 */
async function ensureSrc(track: Track): Promise<LoadResult> {
  if (!track.remoteId) return track.src ? 'ok' : 'error'
  if (track.src && (!track.srcExpiresAt || track.srcExpiresAt > Date.now())) return 'ok'

  try {
    const stream = await getTrackStream(track.remoteId)
    if (stream.playable) {
      track.src = stream.url
      track.srcExpiresAt = stream.expiresAt
      track.unavailable = false
      return 'ok'
    }
    track.unavailable = true
    return 'unavailable'
  } catch (err) {
    // 后端不可达 / 限流 / 曲目被移出歌单（404）：算「这次没拿到」，不标记 unavailable
    console.warn('[music] 直链解析失败', err)
    return 'error'
  }
}

/** 加载并播放某个下标；startAt（秒）用于直链过期后重连时回到原进度 */
async function loadAndPlay(index: number, startAt = 0): Promise<LoadResult> {
  const track = playlist.value[index]
  if (!track) return 'error'
  const el = getAudio()

  const result = await ensureSrc(track)
  if (result !== 'ok') return result

  el.src = track.src as string
  el.load()
  loadedIndex.value = index
  // 网易云曲目自带时长：元数据加载完成前先显示正确时长（不然是 0:00）
  if (track.durationMs) duration.value = track.durationMs / 1000
  if (startAt > 1) {
    const seek = () => {
      el.currentTime = startAt
      el.removeEventListener('loadedmetadata', seek)
    }
    el.addEventListener('loadedmetadata', seek)
  }

  try {
    await el.play()
    isPlaying.value = true
    return 'ok'
  } catch {
    isPlaying.value = false
    return 'error'
  }
}

/**
 * 指针回退到**实际在播的那一首**（没有在播的就保持不动）。
 * playAt 会把 currentIndex 乐观地先拨到目标曲目（点击立刻有反馈，解析要等几百毫秒），
 * 解析失败时必须退回来——否则标题/封面/序号会与正在响的音频、进度条、总时长错位成两首歌
 */
function restorePlayhead() {
  if (loadedIndex.value >= 0) currentIndex.value = loadedIndex.value
}

/**
 * 从 startIndex 起找一个能播的曲目并播放（自动跳过不可播的）。
 * 最多绕队列一圈；全是不可播就提示一句，不空转。
 */
async function playAt(startIndex: number): Promise<void> {
  const total = playlist.value.length
  if (!total) return
  const { toast } = useToast()
  const from = ((startIndex % total) + total) % total
  let skipped: Track | null = null

  for (let step = 0; step < total; step++) {
    const index = (from + step) % total
    const track = playlist.value[index]
    if (!track || track.unavailable) continue

    currentIndex.value = index
    const result = await loadAndPlay(index)
    if (result === 'ok') {
      if (skipped) toast(`《${skipped.title}》暂时无法播放，已跳到下一首`, 'info')
      return
    }
    if (result === 'error') {
      restorePlayhead()
      toast('音乐服务暂时不可用，请稍后再试', 'error')
      return
    }
    skipped ??= track
  }

  restorePlayhead()
  toast('歌单里的曲目暂时都播不了', 'error')
}

async function togglePlay() {
  const el = getAudio()
  if (isPlaying.value) {
    el.pause()
    isPlaying.value = false
    return
  }

  await loadPlaylists()

  // 同一首已经加载过且直链没过期 → 续播（进度保留）；否则走完整加载
  const track = playlist.value[currentIndex.value]
  const stale = track?.srcExpiresAt != null && track.srcExpiresAt <= Date.now()
  if (track && loadedIndex.value === currentIndex.value && track.src && !stale) {
    try {
      await el.play()
      isPlaying.value = true
      return
    } catch {
      /* 元素已出错（如直链失效），落到重新加载 */
    }
  }

  await playAt(currentIndex.value)
}

function seek(percent: number) {
  const el = getAudio()
  if (!el.duration) return
  el.currentTime = (percent / 100) * el.duration
}

function setVolume(val: number) {
  volume.value = val
  if (audio) audio.volume = val / 100
}

function next() {
  void playAt(currentIndex.value + 1)
}

function prev() {
  void playAt(currentIndex.value - 1)
}

/**
 * 按网易云曲目 id 直接点播 —— **「音像店」的入口**：访客在唱片架上点某首歌，
 * 调它即可（同一个 audio 实例、同一份音量与进度状态，跨页 persist 也照旧）。
 * 返回 false 表示该曲不在当前队列里。
 */
async function playTrack(remoteId: number): Promise<boolean> {
  await loadPlaylists()
  const index = playlist.value.findIndex((track) => track.remoteId === remoteId)
  if (index < 0) return false
  await playAt(index)
  return true
}

/**
 * 播放中断的兜底：直链 20 分钟过期（多见于「暂停很久再点播放」）或网络抖动。
 * 重新解析一次并 seek 回原进度；只重试一次，避免坏源造成死循环。
 */
let recovering = false

async function onAudioError() {
  const track = playlist.value[currentIndex.value]
  if (!track?.remoteId || recovering) return

  recovering = true
  try {
    const position = currentTime.value
    track.src = null
    const result = await loadAndPlay(currentIndex.value, position)
    if (result !== 'ok') {
      const { toast } = useToast()
      toast(`《${track.title}》暂时无法播放`, 'error')
    }
  } finally {
    recovering = false
  }
}

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')
  return `${minutes}:${remainder}`
}

const musicStore = reactive({
  playlist,
  currentIndex,
  currentTrack,
  playlistState,
  isPlaying,
  currentTime,
  duration,
  progress,
  volume,
  loadPlaylists,
  playTrack,
  togglePlay,
  seek,
  setVolume,
  next,
  prev,
  formatTime,
})

export function useMusicStore() {
  return musicStore
}
