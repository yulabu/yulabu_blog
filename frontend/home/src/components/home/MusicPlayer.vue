<template>
  <GlassPanel class="music-card">
    <div class="player-header">
      <div>
        <span class="player-kicker">NOW PLAYING</span>
        <h3 class="player-title">音乐时光</h3>
      </div>
      <span class="player-status">
        <i></i>
        LIVE
      </span>
    </div>

    <div class="track-visual">
      <div class="album-art">
        <img :src="musicPlayerImg" alt="音乐封面">
        <span class="album-wash"></span>
        <Icon icon="material-symbols:music-note-rounded" class="album-icon" />
      </div>
      <div class="track-copy">
        <strong>我爱你</strong>
        <span>纳西妲 · Yulabu playlist</span>
      </div>
    </div>

    <audio ref="audioRef" :src="musicSrc" preload="metadata"></audio>

    <div class="progress-row">
      <span>{{ formatTime(currentTime) }}</span>
      <input
        type="range"
        class="seekbar"
        min="0"
        max="100"
        step="0.1"
        :value="progress"
        aria-label="播放进度"
        @input="seek"
      >
      <span>{{ formatTime(duration) }}</span>
    </div>

    <div class="player-controls">
      <button
        type="button"
        class="play-button"
        :aria-label="isPlaying ? '暂停' : '播放'"
        @click="togglePlay"
      >
        <Icon :icon="isPlaying ? 'material-symbols:pause-rounded' : 'material-symbols:play-arrow-rounded'" />
      </button>
      <div class="volume-control">
        <Icon icon="material-symbols:volume-up-outline-rounded" class="volume-icon" />
        <input
          type="range"
          class="volume-range"
          min="0"
          max="100"
          :value="volume"
          aria-label="音量"
          @input="setVolume"
        >
      </div>
    </div>
  </GlassPanel>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import GlassPanel from '@/components/common/GlassPanel.vue'
import musicPlayerImg from '@/assets/img/music_player.jpg'
import musicSrc from '@/assets/music/我爱你 - nxd.mp3'

const audioRef = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const progress = ref(0)
const volume = ref(16)

function onTimeUpdate() {
  const audio = audioRef.value
  if (!audio) return
  currentTime.value = audio.currentTime
  progress.value = (audio.currentTime / audio.duration) * 100 || 0
}

function onLoadedMetadata() {
  const audio = audioRef.value
  if (audio) duration.value = audio.duration
}

function onEnded() {
  isPlaying.value = false
}

onMounted(() => {
  const audio = audioRef.value
  if (!audio) return

  audio.volume = volume.value / 100
  audio.addEventListener('timeupdate', onTimeUpdate)
  audio.addEventListener('loadedmetadata', onLoadedMetadata)
  audio.addEventListener('ended', onEnded)
})

async function togglePlay() {
  const audio = audioRef.value
  if (!audio) return

  if (isPlaying.value) {
    audio.pause()
    isPlaying.value = false
    return
  }

  try {
    await audio.play()
    isPlaying.value = true
  } catch (e) {
    isPlaying.value = false
  }
}

function seek(e) {
  const audio = audioRef.value
  if (!audio || !audio.duration) return
  audio.currentTime = (Number(e.target.value) / 100) * audio.duration
}

function setVolume(e) {
  const audio = audioRef.value
  if (!audio) return
  volume.value = Number(e.target.value)
  audio.volume = volume.value / 100
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

onUnmounted(() => {
  const audio = audioRef.value
  if (!audio) return

  audio.pause()
  audio.src = ''
  audio.removeEventListener('timeupdate', onTimeUpdate)
  audio.removeEventListener('loadedmetadata', onLoadedMetadata)
  audio.removeEventListener('ended', onEnded)
})
</script>

<style scoped>
.music-card {
  width: 100%;
  padding: 18px;
  border-radius: 20px;
  overflow: hidden;
}

.player-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-divider);
}

.player-kicker {
  display: block;
  margin-bottom: 4px;
  color: var(--color-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .16em;
}

.player-title {
  margin: 0;
  color: var(--color-heading);
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 17px;
  line-height: 1.2;
}

.player-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 7px;
  border: 1px solid rgba(var(--color-primary-rgb), .15);
  border-radius: 9px;
  color: var(--color-primary);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .08em;
}

.player-status i {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), .12);
}

.track-visual {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 17px 0 14px;
}

.album-art {
  position: relative;
  isolation: isolate;
  flex: 0 0 auto;
  width: 64px;
  height: 64px;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, .62);
  border-radius: 17px;
  background: rgba(var(--color-primary-rgb), .12);
  box-shadow: 0 5px 14px rgba(var(--color-primary-rgb), .2);
}

.album-art img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.album-wash {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: linear-gradient(135deg, rgba(14, 42, 28, .02), rgba(14, 42, 28, .55));
}

.album-icon {
  position: absolute;
  z-index: 2;
  right: 7px;
  bottom: 6px;
  color: rgba(255, 255, 255, .9);
  font-size: 17px;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, .25));
}

.track-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.track-copy strong {
  overflow: hidden;
  color: var(--color-heading);
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 16px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-copy span {
  overflow: hidden;
  color: var(--color-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

audio {
  display: none;
}

.progress-row {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 32px;
  align-items: center;
  gap: 7px;
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
  font-size: 10px;
}

.progress-row span:last-child {
  text-align: right;
}

.seekbar,
.volume-range {
  width: 100%;
  height: 3px;
  margin: 0;
  border-radius: 4px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.player-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 15px;
}

.play-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid rgba(var(--color-primary-rgb), .18);
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 5px 12px rgba(var(--color-primary-rgb), .25);
  cursor: pointer;
  transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
}

.play-button:hover {
  background: var(--color-primary-hover);
  box-shadow: 0 7px 16px rgba(var(--color-primary-rgb), .32);
  transform: translateY(-2px);
}

.play-button:focus-visible {
  outline: 3px solid rgba(var(--color-primary-rgb), .25);
  outline-offset: 2px;
}

.play-button :deep(svg) {
  font-size: 21px;
}

.volume-control {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 8px;
  max-width: 142px;
}

.volume-icon {
  flex: 0 0 auto;
  color: var(--color-muted);
  font-size: 16px;
}

@media (max-width: 480px) {
  .music-card {
    padding: 16px;
  }

  .volume-control {
    max-width: 126px;
  }
}
</style>
