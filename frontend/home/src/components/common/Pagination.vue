<template>
  <div class="pagination">
    <button
      class="page-btn arrow"
      :disabled="page <= 1"
      @click="goTo(page - 1)"
    >
      <AppIcon icon="material-symbols:chevron-left" class="arrow-icon" />
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
      <AppIcon icon="material-symbols:chevron-right" class="arrow-icon" />
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'

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
  /* 页数多时在窄屏换行（36px × N 会撑破容器，而外层面板是 overflow 裁切，
     直接溢出会让后面的页码点不到） */
  flex-wrap: wrap;
  gap: 10px;
  padding: 16px 0;
}

.page-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  /* 底色走主题变量：固定白底（rgba(255,255,255,.6)）在暗色模式是「浅底 + 浅字」
     （--color-text 是亮绿），对比度约 1.2:1，页码基本看不清 */
  border: 1px solid rgba(var(--color-primary-rgb), 0.28);
  background: rgba(var(--color-primary-rgb), 0.16);
  color: var(--color-text);
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
  border-color: rgba(var(--color-primary-rgb), 0.4);
  background: rgba(var(--color-primary-rgb), 0.26);
  color: var(--color-heading);
}

.page-btn.active {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 2px 8px rgba(99, 149, 86, 0.3);
}

/* 暗色下 --color-primary 是亮绿，白字只有 2.5:1，改用深色前景（与页面底色同色） */
[data-theme='dark'] .page-btn.active {
  color: var(--bg-page);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.arrow-icon {
  font-size: 20px;
}
</style>
