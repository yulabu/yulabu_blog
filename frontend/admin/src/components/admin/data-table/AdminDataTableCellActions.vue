<template>
  <div class="cell-actions">
    <slot />
  </div>
</template>

<style scoped>
.cell-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
}
</style>
