<template>
  <div class="card">
    <div class="cover">
      <img src="../../assets/img/music_player.jpg" alt="">
    </div>
    <div class="info">
      <div class="title">我爱你</div>
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
      <audio ref="audioRef" src="../../assets/music/我爱你 - nxd.mp3"></audio>
      <span class="current-time">{{ formatTime(currentTime) }}</span>
      <input type="range" class="seekbar" :value="progress" @input="seek">
      <span class="duration">{{ formatTime(duration) }}</span>
    </div>
    <div class="btn-box" @click="togglePlay">
      <div class="play"><Icon :icon="isPlaying ? 'material-symbols:pause' : 'material-symbols:play-arrow'" /></div>
    </div>
  </div>
</template>
<style scoped>
  .card{
    z-index: 9;
    width: 100%;
    height: auto;
    padding: 36px;
    border-radius: 5%;
    box-shadow: 0 10px  30px black;
    border-top: 1px solid white;
    border-left: 1px solid white;
    background: linear-gradient(to right bottom,
        rgba(255, 255, 255, .6),
        rgba(255, 255, 255, .3),
        rgba(255, 255, 255, .2));
    backdrop-filter: blur(16px);
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
    background-color: rgb(71, 95, 65, .3);
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
  .info .title {
    color: rgb(99, 149, 86);
    font-family: '华文琥珀';
    font-weight: 60;
    font-size: 24px;
    margin-bottom: 8px;
  }
  .info .singer {
    font-family: '微软雅黑';
    font-weight: 900;
    color: rgb(99, 118, 94);
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
    color: rgb(65, 110, 105);
    min-width: 36px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .seekbar, .volume-range {
    height: 2px;
    border-radius: 3px;
    accent-color: rgb(65, 110, 105);
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
  const audioRef = ref(null);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const progress = ref(0);
  const volume = ref(16);

  onMounted(() => {
    // console.log('audioRef:', audioRef.value)
    const audio = audioRef.value
    if (!audio) return

    audio.volume = volume.value / 100

    audio.addEventListener('timeupdate', () => {
      currentTime.value = audio.currentTime
      progress.value = (audio.currentTime / audio.duration) * 100 || 0
    })

    audio.addEventListener('loadedmetadata', () => {
      duration.value = audio.duration
    })

    audio.addEventListener('ended', () => {
      isPlaying.value = false
    })
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
    }
  })
</script>