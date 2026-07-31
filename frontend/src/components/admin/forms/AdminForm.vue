<template>
  <component :is="as" class="admin-form">
    <slot />
  </component>
</template>

<script setup>
defineProps({
  as: {
    type: String,
    default: 'form'
  }
})
</script>

<style scoped>
.admin-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
