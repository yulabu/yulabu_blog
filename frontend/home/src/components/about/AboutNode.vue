<template>
  <div class="about-node" :class="[side, { 'is-open': open }]">
    <button class="node-marker" type="button" :aria-expanded="open" @click="toggle">
      <Icon :icon="icon" class="marker-icon" />
      <span class="marker-label">{{ title }}</span>
    </button>

    <div class="node-content">
      <GlassPanel as="article" class="node-card" @click="toggle">
        <div class="node-media">
          <img :src="image" :alt="title" loading="lazy" />
        </div>
        <div class="node-body">
          <h3 class="node-title">
            <Icon :icon="icon" class="node-icon" />
            {{ title }}
          </h3>
          <p class="node-summary">{{ summary }}</p>
        </div>
      </GlassPanel>
    </div>

    <!-- 展开弹出层 -->
    <Teleport to="body">
      <Transition name="node-overlay">
        <div v-if="open" class="node-overlay" @click="close">
          <div class="node-popup" :class="side" @click.stop>
            <GlassPanel as="article" class="popup-card">
              <div class="popup-media">
                <img :src="image" :alt="title" loading="lazy" />
              </div>
              <div class="popup-body">
                <h3 class="popup-title">
                  <Icon :icon="icon" class="popup-icon" />
                  {{ title }}
                </h3>
                <p class="popup-summary">{{ summary }}</p>
                <div class="popup-detail">
                  <slot />
                </div>
              </div>
              <button class="popup-close" @click="close" aria-label="关闭">
                <Icon icon="mdi:close" />
              </button>
            </GlassPanel>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import GlassPanel from '@/components/common/GlassPanel.vue'

interface Props {
  title: string
  summary: string
  image: string
  icon: string
  side: 'left' | 'right'
}

const props = defineProps<Props>()
const open = ref(false)

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

// ESC 键关闭
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.about-node {
  position: relative;
  min-height: 140px;
}

.node-marker {
  position: absolute;
  left: 50%;
  top: 70px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: none;
  border-radius: 999px;
  background: rgba(var(--color-primary-rgb), 0.16);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  z-index: 2;
  backdrop-filter: blur(8px);
  transition: transform 0.2s ease, background 0.2s ease;
}

.node-marker:hover {
  transform: translateX(-50%) scale(1.05);
}

.node-content {
  position: relative;
  width: calc(50% - 40px);
}

.about-node.left .node-content {
  margin-right: auto;
}

.about-node.right .node-content {
  margin-left: auto;
}

.node-card {
  padding: 0;
  overflow: hidden;
  border-radius: 20px;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.node-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px var(--shadow-color);
}

.node-media {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.node-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.node-card:hover .node-media img {
  transform: scale(1.05);
}

.node-body {
  padding: 20px;
}

.node-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 10px;
}

.node-icon {
  font-size: 20px;
  color: var(--color-primary);
}

.node-summary {
  font-size: 14px;
  color: var(--color-muted);
  line-height: 1.7;
  margin: 0;
}

/* 弹出层遮罩 */
.node-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

/* 弹出层容器 */
.node-popup {
  position: relative;
  max-width: 680px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

/* 弹出层卡片 */
.popup-card {
  padding: 0;
  overflow: hidden;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.popup-media {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.popup-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.popup-body {
  padding: 32px;
}

.popup-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 16px;
}

.popup-icon {
  font-size: 28px;
  color: var(--color-primary);
}

.popup-summary {
  font-size: 16px;
  color: var(--color-muted);
  line-height: 1.7;
  margin: 0 0 20px;
}

.popup-detail {
  font-size: 15px;
  color: var(--color-text);
  line-height: 1.8;
}

/* 关闭按钮 */
.popup-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: transform 0.2s ease, background 0.2s ease;
  z-index: 10;
}

.popup-close:hover {
  transform: scale(1.1);
  background: white;
}

/* 弹出层动画 */
.node-overlay-enter-active {
  transition: opacity 0.3s ease;
}

.node-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.node-overlay-enter-from,
.node-overlay-leave-to {
  opacity: 0;
}

.node-overlay-enter-active .node-popup {
  animation: popup-enter 0.3s ease forwards;
}

.node-overlay-leave-active .node-popup {
  animation: popup-leave 0.2s ease forwards;
}

@keyframes popup-enter {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes popup-leave {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
}

/* 响应式 */
@media (max-width: 900px) {
  .node-marker {
    left: 20px;
    top: 28px;
    transform: none;
    padding: 8px;
  }

  .node-marker:hover {
    transform: scale(1.05);
  }

  .marker-label {
    display: none;
  }

  .node-content {
    width: calc(100% - 60px);
    margin-left: 60px;
  }

  .node-body {
    padding: 16px;
  }

  .node-overlay {
    padding: 20px;
    align-items: flex-end;
  }

  .popup-card {
    border-radius: 20px 20px 0 0;
  }

  .popup-body {
    padding: 24px;
  }

  .popup-title {
    font-size: 20px;
  }
}

@media (max-width: 640px) {
  .node-marker {
    left: 8px;
    padding: 6px;
  }

  .node-content {
    width: calc(100% - 40px);
    margin-left: 40px;
  }

  .node-media {
    aspect-ratio: 16 / 10;
  }

  .node-title {
    font-size: 16px;
  }

  .node-overlay {
    padding: 0;
  }

  .popup-card {
    border-radius: 0;
    max-height: 100vh;
  }

  .popup-body {
    padding: 20px;
  }

  .popup-title {
    font-size: 18px;
  }

  .popup-summary {
    font-size: 14px;
  }

  .popup-detail {
    font-size: 14px;
  }
}
</style>

<!-- 全局样式（用于 Teleport 到 body 的弹出层） -->
<style>
/* 弹出层遮罩 */
.node-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

/* 弹出层容器 */
.node-popup {
  position: relative;
  max-width: 680px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

/* 弹出层卡片 */
.node-popup .popup-card {
  padding: 0;
  overflow: hidden;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  /* 覆盖 GlassPanel 的半透明背景，使用实色绿色主题 */
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, 0.95),
      rgba(202, 242, 203, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.9);
}

.node-popup .popup-media {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.node-popup .popup-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.node-popup .popup-body {
  padding: 32px;
}

.node-popup .popup-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 16px;
}

.node-popup .popup-icon {
  font-size: 28px;
  color: var(--color-primary);
}

.node-popup .popup-summary {
  font-size: 16px;
  color: var(--color-muted);
  line-height: 1.7;
  margin: 0 0 20px;
}

.node-popup .popup-detail {
  font-size: 15px;
  color: var(--color-text);
  line-height: 1.8;
}

/* 关闭按钮 */
.node-popup .popup-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: transform 0.2s ease, background 0.2s ease;
  z-index: 10;
}

.node-popup .popup-close:hover {
  transform: scale(1.1);
  background: white;
}

/* 弹出层动画 */
.node-overlay-enter-active {
  transition: opacity 0.3s ease;
}

.node-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.node-overlay-enter-from,
.node-overlay-leave-to {
  opacity: 0;
}

.node-overlay-enter-active .node-popup {
  animation: popup-enter 0.3s ease forwards;
}

.node-overlay-leave-active .node-popup {
  animation: popup-leave 0.2s ease forwards;
}

@keyframes popup-enter {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes popup-leave {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
}

/* 响应式 */
@media (max-width: 900px) {
  .node-overlay {
    padding: 20px;
    align-items: flex-end;
  }

  .node-popup .popup-card {
    border-radius: 20px 20px 0 0;
  }

  .node-popup .popup-body {
    padding: 24px;
  }

  .node-popup .popup-title {
    font-size: 20px;
  }
}

@media (max-width: 640px) {
  .node-overlay {
    padding: 0;
  }

  .node-popup .popup-card {
    border-radius: 0;
    max-height: 100vh;
  }

  .node-popup .popup-body {
    padding: 20px;
  }

  .node-popup .popup-title {
    font-size: 18px;
  }

  .node-popup .popup-summary {
    font-size: 14px;
  }

  .node-popup .popup-detail {
    font-size: 14px;
  }
}

/* 暗色主题适配 */
[data-theme="dark"] .node-popup .popup-card {
  background: linear-gradient(to right bottom,
      rgba(50, 65, 60, 0.98),
      rgba(40, 55, 50, 0.95));
  border: 1px solid rgba(255, 255, 255, 0.12);
}

[data-theme="dark"] .node-popup .popup-close {
  background: rgba(50, 65, 60, 0.9);
  color: var(--color-text);
}

[data-theme="dark"] .node-popup .popup-close:hover {
  background: rgba(60, 75, 70, 1);
}
</style>
