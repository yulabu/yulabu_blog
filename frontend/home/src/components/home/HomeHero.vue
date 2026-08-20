<template>
  <div class="home-hero" :class="{ collapsed }">
    <WelcomeBanner />
    <div class="scroll-hint" @click="scrollToContent">
      <div class="chevron"></div>
    </div>
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

function scrollToContent() {
  window.scrollTo({ top: 100, behavior: 'smooth' })
}

onMounted(() => {
  if (uiStore.homeHeroCollapsed) {
    collapsed.value = true
  } else {
    listener = handleScroll
    window.addEventListener('scroll', handleScroll, { passive: true })
  }
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
  height: 100svh;
  overflow: hidden;
  transition: height 0.8s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.home-hero.collapsed {
  height: 360px;
}

.home-hero :deep(.banner) {
  height: 100vh;
  height: 100svh;
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
  font-size: clamp(28px, 6vw, 56px);
  transition: font-size 0.8s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.home-hero.collapsed :deep(.site-title) {
  font-size: clamp(24px, 5vw, 42px);
}

.home-hero :deep(.subtitle) {
  font-size: clamp(18px, 4vw, 32px);
  transition: font-size 0.8s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.home-hero.collapsed :deep(.subtitle) {
  font-size: clamp(20px, 5vw, 42px);
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

.scroll-hint {
  position: absolute;
  bottom: 40px;
  left: 50%;
  z-index: 5;
  opacity: 1;
  cursor: pointer;
  transition: opacity 0.5s ease;
  animation: bounce 1.5s ease-in-out infinite;
}

.scroll-hint:hover .chevron {
  border-color: rgba(255, 255, 255, 0.85);
}

.home-hero.collapsed .scroll-hint {
  opacity: 0;
  pointer-events: none;
}

.chevron {
  width: 24px;
  height: 24px;
  border-right: 3px solid white;
  border-bottom: 3px solid white;
  transform: rotate(45deg);
}

@keyframes bounce {
  0%, 100% { transform: translate(-50%, 0); }
  50% { transform: translate(-50%, 12px); }
}

@media (max-width: 768px) {
  .home-hero {
    height: 320px;
  }

  .home-hero.collapsed {
    height: 280px;
  }

  .home-hero :deep(.banner) {
    height: 320px;
  }

  .home-hero.collapsed :deep(.banner) {
    height: 280px;
  }

  .home-hero :deep(.content) {
    padding-top: 40px;
  }

  .scroll-hint {
    bottom: 24px;
  }
}
</style>
