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
          <Transition name="node-expand">
            <div v-if="open" class="node-detail">
              <slot />
            </div>
          </Transition>
        </div>
      </GlassPanel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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

.about-node:hover .node-media img {
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

.node-detail {
  padding-top: 16px;
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.8;
}

.node-expand-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.node-expand-leave-active {
  transition: opacity 0.15s ease;
}

.node-expand-enter-from,
.node-expand-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

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
}
</style>
