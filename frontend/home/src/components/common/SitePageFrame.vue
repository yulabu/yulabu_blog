<template>
  <div class="site-page-frame">
    <header class="site-page-frame__banner">
      <slot name="banner">
        <WelcomeBanner :variant="variant" />
      </slot>
    </header>
    <slot />
  </div>
</template>

<script setup>
import WelcomeBanner from '@/components/home/WelcomeBanner.vue'

defineProps({
  /** 刊头文案组 key（见 utils/bannerTexts.ts），缺省落到首页那组 */
  variant: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.site-page-frame {
  width: 100%;
  min-height: 100vh;
  background-color: var(--bg-page);
  overflow: hidden;
}

.site-page-frame__banner {
  width: 100%;
}

@media (max-width: 768px) {
  .site-page-frame__banner {
    display: none;
  }
}
</style>
