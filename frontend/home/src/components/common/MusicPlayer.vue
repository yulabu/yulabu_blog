<template>
  <div class="music-player" :class="{ expanded, collapsed: !expanded }">
    <!-- 展开态：完整面板 -->
    <div class="panel-wrapper" v-show="expanded">
      <img class="nahida-deco" src="@/assets/img/nahida_music.png" alt="" />
      <div class="panel">
      <div class="panel-header">
        <div>
          <span class="panel-kicker">NOW PLAYING</span>
          <h3 class="panel-title">音乐时光</h3>
        </div>
        <button class="icon-btn collapse-btn" @click="expanded = false" aria-label="收起">
          <Icon icon="material-symbols:keyboard-arrow-down" />
        </button>
      </div>

      <div class="track-visual">
        <div class="album-art">
          <img :src="musicStore.currentTrack.cover" alt="音乐封面">
          <span class="album-wash"></span>
          <Icon icon="material-symbols:music-note-rounded" class="album-icon" />
        </div>
        <div class="track-copy">
          <strong>{{ musicStore.currentTrack.title }}</strong>
          <span>{{ musicStore.currentTrack.artist }}</span>
        </div>
      </div>

      <div class="progress-row">
        <span>{{ musicStore.formatTime(musicStore.currentTime) }}</span>
        <input
          type="range"
          class="seekbar"
          min="0"
          max="100"
          step="0.1"
          :value="musicStore.progress"
          aria-label="播放进度"
          @input="onSeek"
        >
        <span>{{ musicStore.formatTime(musicStore.duration) }}</span>
      </div>

      <div class="player-controls">
        <button
          type="button"
          class="play-button"
          :aria-label="musicStore.isPlaying ? '暂停' : '播放'"
          @click="musicStore.togglePlay"
        >
          <Icon :icon="musicStore.isPlaying ? 'material-symbols:pause-rounded' : 'material-symbols:play-arrow-rounded'" />
        </button>
        <div class="volume-control">
          <Icon icon="material-symbols:volume-up-outline-rounded" class="volume-icon" />
          <input
            type="range"
            class="volume-range"
            min="0"
            max="100"
            :value="musicStore.volume"
            aria-label="音量"
            @input="onVolumeChange"
          >
        </div>
      </div>
      </div>
    </div>

    <!-- 收起态：迷你条 -->
    <div v-show="!expanded" class="mini-bar" @click="expanded = true">
      <div class="mini-art">
        <img :src="musicStore.currentTrack.cover" alt="封面">
        <span v-if="musicStore.isPlaying" class="mini-playing-dot"></span>
      </div>
      <span class="mini-title">{{ musicStore.currentTrack.title }}</span>
      <button
        class="icon-btn mini-play-btn"
        :aria-label="musicStore.isPlaying ? '暂停' : '播放'"
        @click.stop="musicStore.togglePlay"
      >
        <Icon :icon="musicStore.isPlaying ? 'material-symbols:pause-rounded' : 'material-symbols:play-arrow-rounded'" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useMusicStore } from '@/stores/music'

const route = useRoute()
const musicStore = useMusicStore()

const isHome = computed(() => route.name === 'Home')
const expanded = ref(true)

watch(isHome, (val) => {
  expanded.value = val
}, { immediate: true })

function onSeek(e) {
  musicStore.seek(Number(e.target.value))
}

function onVolumeChange(e) {
  musicStore.setVolume(Number(e.target.value))
}
</script>

<style scoped>
.music-player {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1100;
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.music-player.collapsed {
  width: 220px;
}

.music-player.expanded {
  width: 300px;
}

/* ===== 纳西妲装饰 ===== */
.panel-wrapper {
  position: relative;
  overflow: visible;
}

.nahida-deco {
  position: absolute;
  bottom: 100%;
  left: 25%;
  transform: translateX(-50%);
  width: 55%;
  max-width: 150px;
  margin-bottom: -102px;
  z-index: 10;
  pointer-events: none;
}

/* ===== 展开态面板 ===== */
.panel {
  border-radius: 20px;
  padding: 18px;
  overflow: hidden;
  border-top: 1px solid var(--border-light);
  border-left: 1px solid var(--border-light);
  box-shadow: 0 8px 32px var(--shadow-color);
  background: linear-gradient(to right bottom,
      var(--bg-glass-start),
      var(--bg-glass-mid),
      var(--bg-glass-end));
  backdrop-filter: blur(16px);
  animation: panelIn 0.3s ease;
}

@keyframes panelIn {
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-divider);
}

.panel-kicker {
  display: block;
  margin-bottom: 4px;
  color: var(--color-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .16em;
}

.panel-title {
  margin: 0;
  color: var(--color-heading);
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 17px;
  line-height: 1.2;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(99, 149, 86, 0.12);
  color: var(--color-muted);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  flex-shrink: 0;
}

.icon-btn:hover {
  background: rgba(99, 149, 86, 0.25);
  color: var(--color-primary);
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

/* ===== 收起态迷你条 ===== */
.mini-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 12px 0 0;
  border-radius: 24px;
  border-top: 1px solid var(--border-light);
  border-left: 1px solid var(--border-light);
  box-shadow: 0 4px 20px var(--shadow-color);
  background: linear-gradient(to right bottom,
      var(--bg-glass-start),
      var(--bg-glass-mid),
      var(--bg-glass-end));
  backdrop-filter: blur(16px);
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
  animation: miniIn 0.25s ease;
}

@keyframes miniIn {
  from { opacity: 0; transform: translateY(8px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.mini-bar:hover {
  box-shadow: 0 6px 28px var(--shadow-color);
  transform: translateY(-2px);
}

.mini-art {
  position: relative;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, .5);
}

.mini-art img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.mini-playing-dot {
  position: absolute;
  bottom: 3px;
  right: 3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, .8);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.mini-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--color-heading);
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 13px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-play-btn {
  width: 32px;
  height: 32px;
  background: var(--color-primary);
  color: #fff;
  flex-shrink: 0;
}

.mini-play-btn:hover {
  background: var(--color-primary-hover);
}

.mini-play-btn :deep(svg) {
  font-size: 18px;
}

/* ===== 响应式 ===== */
@media (max-width: 480px) {
  .music-player {
    bottom: 16px;
    right: 16px;
  }

  .music-player.expanded {
    width: 260px;
  }

  .panel {
    padding: 14px;
  }

  .volume-control {
    max-width: 110px;
  }
}
</style>
