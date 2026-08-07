<template>
  <Transition name="fade">
    <div v-if="visible" class="loading-overlay">
      <div class="spinner"></div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean }>()
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay-bg);
  backdrop-filter: blur(4px);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(var(--color-accent-rgb), 0.2);
  border-top-color: var(--color-primary, #4a8b3c);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
