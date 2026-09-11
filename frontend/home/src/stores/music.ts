import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import defaultCoverMeta from '@/assets/img/music_player.webp'
import defaultSrc from '@/assets/music/我爱你 - nxd.mp3'

export interface Track {
  id: string
  title: string
  artist: string
  src: string
  cover: string
}
// 后续加入歌单就改这个Track
const defaultTrack: Track = {
  id: '1',
  title: '我爱你',
  artist: '纳西妲 · Yulabu playlist',
  src: defaultSrc,
  cover: defaultCoverMeta.src,
}

export const useMusicStore = defineStore('music', () => {
  const playlist = ref<Track[]>([defaultTrack])
  const currentIndex = ref(0)
  const currentTrack = computed(() => playlist.value[currentIndex.value] ?? defaultTrack)

  const audio = new Audio()
  // 刻意不在初始化时 load：那会让每次页面加载都去拉这首 3.7 MB 曲子的元数据，
  // 实测是 Lighthouse 网络负载的第一项（3,656.6 KiB，占第一方 7.4 MB 的 49%），
  // 而访客多半不会点播放。首次播放时 togglePlay 里的 loadedIndex !== currentIndex
  // 分支会自然加载（代价：未播放前时长显示 0:00）。
  audio.preload = 'none'
  audio.volume = 0.16

  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(16)
  const loadedIndex = ref(-1)

  const progress = computed(() =>
    (currentTime.value / duration.value) * 100 || 0
  )

  function onTimeUpdate() {
    currentTime.value = audio.currentTime
  }

  function onLoadedMetadata() {
    duration.value = audio.duration
  }

  function onEnded() {
    next()
  }

  audio.addEventListener('timeupdate', onTimeUpdate)
  audio.addEventListener('loadedmetadata', onLoadedMetadata)
  audio.addEventListener('ended', onEnded)

  function loadTrack(index: number) {
    const track = playlist.value[index]
    if (!track) return
    audio.src = track.src
    audio.load()
    loadedIndex.value = index
  }

  async function togglePlay() {
    if (isPlaying.value) {
      audio.pause()
      isPlaying.value = false
      return
    }

    if (loadedIndex.value !== currentIndex.value) {
      loadTrack(currentIndex.value)
    }

    try {
      await audio.play()
      isPlaying.value = true
    } catch {
      isPlaying.value = false
    }
  }

  function seek(percent: number) {
    if (!audio.duration) return
    audio.currentTime = (percent / 100) * audio.duration
  }

  function setVolume(val: number) {
    volume.value = val
    audio.volume = val / 100
  }

  function next() {
    const nextIndex = (currentIndex.value + 1) % playlist.value.length
    currentIndex.value = nextIndex
    loadTrack(nextIndex)
    audio.play().then(() => {
      isPlaying.value = true
    }).catch(() => {
      isPlaying.value = false
    })
  }

  function prev() {
    const prevIndex = currentIndex.value === 0
      ? playlist.value.length - 1
      : currentIndex.value - 1
    currentIndex.value = prevIndex
    loadTrack(prevIndex)
    audio.play().then(() => {
      isPlaying.value = true
    }).catch(() => {
      isPlaying.value = false
    })
  }

  function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const remainder = Math.floor(seconds % 60).toString().padStart(2, '0')
    return `${minutes}:${remainder}`
  }

  // 曲目改为按需加载（见上面 audio.preload 的说明），不再在 store 初始化时 loadTrack(0)

  return {
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
  }
})
