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
  background: rgba(202, 242, 203, 0.6);
  backdrop-filter: blur(4px);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(80, 140, 134, 0.2);
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
