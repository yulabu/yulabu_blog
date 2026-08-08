<template>
  <span class="cell-title" :class="{ 'is-truncated': truncate }">
    <span v-if="title" class="cell-title__text">{{ title }}</span>
    <slot v-else />
  </span>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  truncate: {
    type: Boolean,
    default: true
  },
  maxWidth: {
    type: String,
    default: '300px'
  }
})
</script>

<style scoped>
.cell-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--color-heading);
}

.cell-title.is-truncated .cell-title__text {
  display: inline-block;
  max-width: v-bind(maxWidth);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
