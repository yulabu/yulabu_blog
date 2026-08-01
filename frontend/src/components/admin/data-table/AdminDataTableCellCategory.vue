<template>
  <span v-if="name" class="cell-category">{{ name }}</span>
  <AdminDataTableCellText v-else muted />
</template>

<script setup>
import AdminDataTableCellText from './AdminDataTableCellText.vue'

defineProps({
  name: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.cell-category {
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(99, 149, 86, 0.85);
  color: white;
  font-size: 12px;
}
</style>
