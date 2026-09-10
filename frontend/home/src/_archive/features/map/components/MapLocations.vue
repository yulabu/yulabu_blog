<template>
  <g class="map-locations">
    <MapLocation
      v-for="location in locations"
      :key="location.id"
      :location="location"
      :on-navigate="onNavigate"
      :style="{ animationDelay: `${delays[location.id]}ms` }"
      class="location-enter"
    />
  </g>
</template>

<script setup>
import { computed } from 'vue'
import { mapLocations } from '../data/mapLocations'
import MapLocation from './MapLocation.vue'

const props = defineProps({
  onNavigate: {
    type: Function,
    required: true
  }
})

const locations = computed(() => mapLocations)

const delays = computed(() => {
  const d = {}
  locations.value.forEach((loc, index) => {
    d[loc.id] = 120 + index * 90
  })
  return d
})
</script>

<style scoped>
.map-locations {
  pointer-events: all;
}

.location-enter :deep(.location-body) {
  animation: popIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
