<template>
  <div class="map-page">
    <GlassPanel as="router-link" to="/" class="map-back">
      <Icon icon="material-symbols:arrow-back-rounded" class="back-icon" />
      <span class="back-text">返回</span>
    </GlassPanel>

    <WorldMap />

    <div class="map-hint">
      <span class="hint-line"></span>
      <span class="hint-text">点击岛屿，开始探索</span>
      <span class="hint-line"></span>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import GlassPanel from '@/components/common/GlassPanel.vue'
import WorldMap from '@/features/map/components/WorldMap.vue'
</script>

<style scoped>
.map-page {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100svh;
  background: radial-gradient(ellipse at center, var(--bg-page) 0%, var(--bg-page) 70%);
  overflow: hidden;
}

.map-back {
  position: fixed;
  top: 20px;
  left: 24px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 24px;
  text-decoration: none;
  color: var(--color-heading);
  font-size: 14px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.map-back:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px var(--shadow-color);
}

.back-icon {
  font-size: 18px;
  color: var(--color-primary);
}

.back-text {
  font-weight: 500;
}

.map-hint {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 12px;
  pointer-events: none;
}

.hint-text {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 13px;
  color: var(--color-muted);
  letter-spacing: 1px;
  animation: breathe 3s ease-in-out infinite;
}

.hint-line {
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-muted), transparent);
  opacity: 0.4;
}

@keyframes breathe {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .map-back {
    top: 16px;
    left: 16px;
    padding: 8px 12px;
  }

  .back-text {
    display: none;
  }

  .map-hint {
    bottom: 20px;
  }

  .hint-line {
    width: 24px;
  }
}
</style>
