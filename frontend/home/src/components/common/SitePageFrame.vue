<template>
  <div class="site-page-frame">
    <header class="site-page-frame__banner">
      <slot name="banner">
        <WelcomeBanner :show-typing="showTyping" :subtitle="subtitle" />
      </slot>
    </header>
    <slot />
  </div>
</template>

<script setup>
import WelcomeBanner from '@/components/home/WelcomeBanner.vue'

defineProps({
  subtitle: {
    type: String,
    default: ''
  },
  showTyping: {
    type: Boolean,
    default: true
  }
})
</script>

<style scoped>
.site-page-frame {
  width: 100%;
  min-height: 100vh;
  background-color: var(--bg-page);
}

.site-page-frame__banner {
  width: 100%;
}
</style>
