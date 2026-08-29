<template>
  <component :is="as" class="glass-panel">
    <slot />
  </component>
</template>

<script setup>
defineProps({
  as: {
    type: String,
    default: 'div'
  }
})
</script>

<style scoped>
.glass-panel {
  border-top: 1px solid var(--border-light);
  border-left: 1px solid var(--border-light);
  box-shadow: 0 4px 12px var(--shadow-color);
  background: linear-gradient(to right bottom,
      var(--bg-glass-start),
      var(--bg-glass-mid),
      var(--bg-glass-end));
  backdrop-filter: blur(16px);
}
</style>
