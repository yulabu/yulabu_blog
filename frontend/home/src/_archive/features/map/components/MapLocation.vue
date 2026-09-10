<template>
  <g
    class="map-location"
    :transform="`translate(${location.position.x}, ${location.position.y})`"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="handleClick"
  >
    <g class="location-body" :class="{ hovered: isHovered, navigating: isNavigating }">
      <!-- 外发光 -->
      <ellipse cx="0" cy="14" rx="46" ry="18" class="location-glow" />

      <!-- 岛屿主体 -->
      <path :d="islandPath" class="location-island" />

      <!-- 图标 -->
      <foreignObject x="-22" y="-34" width="44" height="44">
        <div class="location-icon" xmlns="http://www.w3.org/1999/xhtml">
          <Icon :icon="location.icon" />
        </div>
      </foreignObject>

      <!-- 标签 -->
      <text y="46" class="location-name">{{ location.name }}</text>
      <text y="64" class="location-desc">{{ location.desc }}</text>
    </g>
  </g>
</template>

<script setup>
import { ref } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  location: {
    type: Object,
    required: true
  },
  onNavigate: {
    type: Function,
    required: true
  }
})

const isHovered = ref(false)
const isNavigating = ref(false)

// 统一的有机岛形
const islandPath = 'M0,-40 C20,-42 42,-26 48,-4 C54,18 42,40 18,48 C-2,54 -28,46 -46,26 C-58,8 -52,-18 -34,-34 C-18,-46 -8,-42 0,-40'

async function handleClick() {
  if (isNavigating.value) return
  isNavigating.value = true
  try {
    await props.onNavigate(props.location)
  } finally {
    isNavigating.value = false
  }
}
</script>

<style scoped>
.map-location {
  cursor: pointer;
  transition: filter 0.3s ease;
}

.map-location .location-island {
  fill: var(--bg-card-strong);
  stroke: var(--border-divider);
  stroke-width: 1.5;
  transition: fill 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: 0 0;
  filter: drop-shadow(0 6px 12px var(--shadow-color));
}

.map-location .location-glow {
  fill: var(--color-primary);
  opacity: 0;
  transition: opacity 0.35s ease;
  filter: blur(12px);
}

.map-location .location-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: 22px;
  transition: color 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.map-location .location-name {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 15px;
  font-weight: 600;
  fill: var(--color-heading);
  text-anchor: middle;
  opacity: 0.85;
  transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

.map-location .location-desc {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 11px;
  fill: var(--color-muted);
  text-anchor: middle;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

.map-location .location-body {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: 0 0;
}

.map-location .location-body.hovered .location-island,
.map-location .location-body.navigating .location-island {
  fill: var(--bg-personal-top);
}

.map-location .location-body.hovered,
.map-location .location-body.navigating {
  transform: scale(1.12);
}

.map-location .location-body.hovered .location-glow,
.map-location .location-body.navigating .location-glow {
  opacity: 0.35;
}

.map-location .location-body.hovered .location-icon,
.map-location .location-body.navigating .location-icon {
  color: var(--color-heading);
  transform: scale(1.15) rotate(-4deg);
}

.map-location .location-body.hovered .location-name,
.map-location .location-body.navigating .location-name {
  opacity: 1;
  transform: translateY(-4px);
}

.map-location .location-body.hovered .location-desc,
.map-location .location-body.navigating .location-desc {
  opacity: 0.9;
  transform: translateY(0);
}

.map-location .location-body.navigating .location-island {
  filter: drop-shadow(0 0 18px rgba(var(--color-primary-rgb), 0.6));
}
</style>
