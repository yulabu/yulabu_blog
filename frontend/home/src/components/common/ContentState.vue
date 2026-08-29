<template>
  <div class="content-state" :class="[`content-state--${kind}`, `content-state--${size}`]">
    <Icon v-if="icon" :icon="icon" class="content-state__icon" />
    <span><slot /></span>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  kind: {
    type: String,
    default: 'empty'
  },
  size: {
    type: String,
    default: 'default'
  },
  icon: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.content-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--color-text);
  font-size: 14px;
  opacity: .6;
  text-align: center;
}

.content-state--page {
  padding: 60px 0;
}

.content-state--panel {
  padding: 40px 0;
}

.content-state--compact {
  padding: 20px 0;
  font-size: 13px;
  opacity: .45;
}

.content-state__icon {
  margin-bottom: 8px;
  font-size: 32px;
}
</style>
