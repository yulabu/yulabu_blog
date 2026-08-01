<template>
  <span class="cell-text" :class="{ 'is-muted': muted }">
    <slot v-if="$slots.default" />
    <template v-else>{{ placeholder }}</template>
  </span>
</template>

<script setup>
defineProps({
  muted: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: '-'
  }
})
</script>

<style scoped>
.cell-text.is-muted {
  color: rgb(120, 140, 125);
}
</style>
