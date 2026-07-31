<template>
  <div class="admin-form-group">
    <slot />
  </div>
</template>

<style scoped>
.admin-form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
