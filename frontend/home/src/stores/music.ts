import { ref, computed, reactive } from 'vue'
import defaultCoverMeta from '@/assets/img/music_player.webp'
import defaultSrc from '@/assets/music/我爱你 - nxd.mp3'

export interface Track {
  id: string
  title: string
  artist: string
  src: string
  cover: string
}

// 后续加入歌单就改这个 Track
const defaultTrack: Track = {
  id: '1',
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

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(16)
const loadedIndex = ref(-1)

const progress = computed(() => (currentTime.value / duration.value) * 100 || 0)

/**
 * Audio 惰性创建：本模块会被 SSR 包求值（Layout → MusicPlayer → 这里），
 * 模块顶层 `new Audio()` 在 Node 里会直接 ReferenceError。
 * 顺带保住「不在初始化时 load」的既有优化：preload='none'，首次播放才真正拉这首 3.7 MB
 * 的曲子（实测它是 Lighthouse 网络负载的第一项，占第一方流量的 49%），
 * 未播放前时长显示 0:00 是已知代价。
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
  return audio
}

function loadTrack(index: number) {
  const track = playlist.value[index]
  if (!track) return
  const el = getAudio()
  el.src = track.src
  el.load()
  loadedIndex.value = index
}

async function togglePlay() {
  const el = getAudio()
  if (isPlaying.value) {
    el.pause()
    isPlaying.value = false
    return
  }

  if (loadedIndex.value !== currentIndex.value) loadTrack(currentIndex.value)

  try {
    await el.play()
    isPlaying.value = true
  } catch {
    isPlaying.value = false
  }
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
  const nextIndex = (currentIndex.value + 1) % playlist.value.length
  currentIndex.value = nextIndex
  loadTrack(nextIndex)
  getAudio()
    .play()
    .then(() => {
      isPlaying.value = true
    })
    .catch(() => {
      isPlaying.value = false
    })
}

function prev() {
  const prevIndex = currentIndex.value === 0 ? playlist.value.length - 1 : currentIndex.value - 1
  currentIndex.value = prevIndex
  loadTrack(prevIndex)
  getAudio()
    .play()
    .then(() => {
      isPlaying.value = true
    })
    .catch(() => {
      isPlaying.value = false
    })
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
  isPlaying,
  currentTime,
  duration,
  progress,
  volume,
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
