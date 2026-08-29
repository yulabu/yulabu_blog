<template>
  <GlassPanel class="card">
    <div class="cover">
      <img :src="musicPlayerImg" alt="">
    </div>
    <div class="info">
      <div class="singer">纳西妲</div>
    </div>
    <div class="volume-box">
      <span class="volume-down">
        <i class="icons">-</i>
      </span>
      <input type="range" class="volume-range" @input="setVolume">
      <span class="volume-up">
        <i class="icons">+</i>
      </span>
    </div>
    <div class="music-box">
      <audio ref="audioRef" :src="musicSrc"></audio>
      <span class="current-time">{{ formatTime(currentTime) }}</span>
      <input type="range" class="seekbar" :value="progress" @input="seek">
      <span class="duration">{{ formatTime(duration) }}</span>
    </div>
    <div class="btn-box" @click="togglePlay">
      <div class="play"><Icon :icon="isPlaying ? 'material-symbols:pause' : 'material-symbols:play-arrow'" /></div>
    </div>
  </GlassPanel>
</template>
<style scoped>
  .card{
    z-index: 9;
    width: 100%;
    height: auto;
    padding: 36px;
    border-radius: 5%;
     overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

  } 
  .cover{
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 5px;
  }
  .cover img{
    width: 100%;
    display: block;
    object-fit: cover;
    object-position: top;
  }
  .btn-box {
    display: flex;
    text-align: center;
    justify-content: center;
    position: relative;
    cursor: default;
    user-select: none;
    width: 50px;
    height: 50px;
    background-color: rgba(var(--color-primary-rgb), .3);
    border-radius: 25px;
  }
  .play {
    position: absolute;
    display: flex;
    text-align: center;
    justify-content: center;
    margin-top: 8px;
  }
  .play svg {
    width: 32px;
    height: 32px;
  }
  .info {
    letter-spacing: 1px;
    text-align: center;
    margin-top: 16px;
  }
  .info .singer {
    font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
    font-weight: 900;
    color: var(--color-text);
    margin-bottom: 8px;
  }
  .music-box, .volume-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    gap: 16px;
  }
  .current-time,
  .duration {
    font-size: 12px;
    color: var(--color-text);
    min-width: 36px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .seekbar, .volume-range {
    height: 2px;
    border-radius: 3px;
    accent-color: var(--color-text);
    outline: none;
  }
  .seekbar {
    flex: 1;
  }
  .volume-range {
    width: 100%;
  }
</style>
<script setup>
  import { ref, onMounted, onUnmounted } from 'vue';
  import { Icon } from '@iconify/vue'
  import GlassPanel from '@/components/common/GlassPanel.vue'
  import musicPlayerImg from '@/assets/img/music_player.jpg'
  import musicSrc from '@/assets/music/我爱你 - nxd.mp3'
  const audioRef = ref(null);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const progress = ref(0);
  const volume = ref(16);

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
  function togglePlay() {
    const audio = audioRef.value
    if (!audio) return
    if (isPlaying.value) {
      audio.pause()
    } else {
      audio.play()
    }
    isPlaying.value = !isPlaying.value
  }
  function seek(e) {
    const audio = audioRef.value
    if (!audio || !audio.duration) return
    audio.currentTime = (e.target.value / 100) * audio.duration
  }

  function setVolume(e) {
    const audio = audioRef.value
    if (!audio) return
    volume.value = e.target.value
    audio.volume = volume.value / 100
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }
  onUnmounted(() => {
    const audio = audioRef.value
    if (audio) {
      audio.pause()
      audio.src = ''
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  })
</script>
