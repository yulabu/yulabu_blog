<template>
  <div class="pagination">
    <button
      class="page-btn arrow"
      :disabled="page <= 1"
      @click="goTo(page - 1)"
    >
      <Icon icon="material-symbols:chevron-left" class="arrow-icon" />
    </button>

    <button
      v-for="p in pages"
      :key="p"
      class="page-btn"
      :class="{ active: p === page }"
      @click="goTo(p)"
    >
      {{ p }}
    </button>

    <button
      class="page-btn arrow"
      :disabled="page >= totalPages"
      @click="goTo(page + 1)"
    >
      <Icon icon="material-symbols:chevron-right" class="arrow-icon" />
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  page: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 }
})

const emit = defineEmits(['update:page'])

const pages = computed(() => {
  const list = []
  for (let i = 1; i <= props.totalPages; i++) {
    list.push(i)
  }
  return list
})

function goTo(p) {
  if (p < 1 || p > props.totalPages || p === props.page) return
  emit('update:page', p)
}
</script>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 0;
}

.page-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.6);
  color: rgb(65, 110, 105);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.page-btn:hover:not(:disabled) {
  background: rgba(99, 149, 86, 0.15);
  color: rgb(45, 90, 65);
}

.page-btn.active {
  background: rgb(99, 149, 86);
  color: white;
  box-shadow: 0 2px 8px rgba(99, 149, 86, 0.3);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.arrow-icon {
  font-size: 20px;
}
</style>
