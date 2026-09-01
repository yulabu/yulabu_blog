<template>
  <AdminTooltip v-if="title" :content="title" :delay="200">
    <span class="cell-text" :class="{ 'is-muted': muted }">
      <slot v-if="$slots.default" />
      <template v-else>{{ placeholder }}</template>
    </span>
  </AdminTooltip>
  <span v-else class="cell-text" :class="{ 'is-muted': muted }">
    <slot v-if="$slots.default" />
    <template v-else>{{ placeholder }}</template>
  </span>
</template>

<script setup>
import AdminTooltip from '@/components/common/AdminTooltip.vue'

defineProps({
  muted: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: '-'
  },
  title: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.cell-text.is-muted {
  color: var(--color-muted);
}
</style>
