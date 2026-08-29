<template>
  <div class="top-progress" v-show="active || done" :class="{ 'is-done': done }">
    <div class="top-progress__bar"></div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

const active = ref(false)
const done = ref(false)
let timer = null

watch(() => props.loading, (value) => {
  clearTimeout(timer)
  if (value) {
    done.value = false
    active.value = true
  } else {
    // 熄灭时先补满至 100%，再淡出移除
    done.value = true
    timer = setTimeout(() => {
      active.value = false
      done.value = false
    }, 320)
  }
})
</script>

<style scoped>
.top-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 10000;
  overflow: hidden;
  pointer-events: none;
  opacity: 1;
  transition: opacity .25s ease;
}

.top-progress.is-done {
  opacity: 0;
}

.top-progress__bar {
  width: 0;
  height: 100%;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  box-shadow: 0 0 10px rgba(var(--color-primary-rgb), .55);
  animation: progress 1.4s cubic-bezier(.4, 0, .6, 1) forwards;
}

.top-progress.is-done .top-progress__bar {
  width: 100%;
  animation: none;
  transition: width .3s ease;
}

@keyframes progress {
  0% { width: 0; }
  70% { width: 88%; }
  100% { width: 90%; }
}
</style>