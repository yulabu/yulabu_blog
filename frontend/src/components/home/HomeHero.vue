<template>
  <div class="home-hero" :class="{ collapsed }">
    <WelcomeBanner />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useUiStore } from '@/stores/ui'
import WelcomeBanner from '@/components/home/WelcomeBanner.vue'

const uiStore = useUiStore()
const collapsed = ref(false)
let listener: (() => void) | null = null

function handleScroll() {
  if (!collapsed.value && window.scrollY > 20) {
    collapsed.value = true
    uiStore.setHomeHeroCollapsed(true)
    if (listener) {
      window.removeEventListener('scroll', listener)
      listener = null
    }
  }
}

onMounted(() => {
  uiStore.setHomeHeroCollapsed(false)
  listener = handleScroll
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  if (listener) {
    window.removeEventListener('scroll', listener)
  }
})
</script>

<style scoped>
.home-hero {
  position: relative;
  height: 100vh;
  overflow: hidden;
  transition: height 0.8s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.home-hero.collapsed {
  height: 360px;
}

.home-hero :deep(.banner) {
  height: 100vh;
  transition: height 0.8s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.home-hero.collapsed :deep(.banner) {
  height: 360px;
}

.home-hero :deep(.content) {
  padding-top: 0;
  transition: padding-top 0.8s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.home-hero.collapsed :deep(.content) {
  padding-top: 76px;
}

.home-hero :deep(.site-title) {
  font-size: 56px;
  transition: font-size 0.8s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.home-hero.collapsed :deep(.site-title) {
  font-size: 42px;
}

.home-hero :deep(.subtitle) {
  font-size: 32px;
  transition: font-size 0.8s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.home-hero.collapsed :deep(.subtitle) {
  font-size: 42px;
}

.home-hero :deep(.waves) {
  opacity: 0;
  transition: opacity 0.5s ease 0.2s;
}

.home-hero.collapsed :deep(.waves) {
  opacity: 1;
}

.home-hero:not(.collapsed) :deep(.bg) {
  background-position: top center;
}
</style>
