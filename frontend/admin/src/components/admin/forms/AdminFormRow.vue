<template>
  <div class="admin-form-row" :class="{ 'admin-form-row--inline': inline }">
    <slot />
  </div>
</template>

<script setup>
defineProps({
  inline: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.admin-form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.admin-form-row--inline {
  flex-direction: row;
  gap: 16px;
}
</style>
