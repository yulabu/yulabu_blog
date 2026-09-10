<template>
  <div class="map-viewport" :class="{ ready: isReady }">
    <svg
      ref="svgRef"
      class="map-svg"
      viewBox="0 0 2000 1200"
      preserveAspectRatio="xMidYMid meet"
    >
      <g ref="worldRef" class="world-group">
        <MapBackground />
        <MapLocations :on-navigate="navigateTo" />
      </g>
    </svg>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import MapBackground from './MapBackground.vue'
import MapLocations from './MapLocations.vue'
import { useMapNavigation } from '../composables/useMapNavigation'

const svgRef = ref(null)
const worldRef = ref(null)
const isReady = ref(false)

const { navigateTo, camera } = useMapNavigation(worldRef)

onMounted(async () => {
  await nextTick()
  isReady.value = true
  camera.entrance()
})

onUnmounted(() => {
  camera.destroy()
})
</script>

<style scoped>
.map-viewport {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.6s ease;
}

.map-viewport.ready {
  opacity: 1;
}

.map-svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.world-group {
  will-change: transform;
  transform-origin: 0 0;
}
</style>
