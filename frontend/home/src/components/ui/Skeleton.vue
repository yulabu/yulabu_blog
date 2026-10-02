<template>
  <div class="ui-skeleton" :class="`ui-skeleton--${variant}`" aria-hidden="true">
    <span
      v-for="n in count"
      :key="n"
      class="ui-skeleton__bar"
      :style="{ height: `${height}px`, width: count > 1 ? `${100 - (n - 1) * 12}%` : '100%' }"
    ></span>
  </div>
</template>

<script setup>
/**
 * 骨架屏：加载态用，替代原来 7 处硬编码的「加载中...」文本。
 * 只在客户端兜底取数（后端不可达、烘焙数据缺席）时出现，所以保持极简：
 * 一个呼吸动画 + 令牌取色，prefers-reduced-motion 下退化为静态色块。
 */
defineProps({
  /** line 文本行 / card 卡片块 / row 列表行 */
  variant: { type: String, default: 'line' },
  count: { type: Number, default: 3 },
  height: { type: Number, default: 14 }
})
</script>

<style scoped>
.ui-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.ui-skeleton__bar {
  display: block;
  border-radius: 8px;
  background: rgba(var(--color-primary-rgb), 0.12);
  animation: ui-skeleton-pulse 1.6s ease-in-out infinite;
}

.ui-skeleton--card .ui-skeleton__bar {
  height: 120px;
  border-radius: 12px;
}

.ui-skeleton--row .ui-skeleton__bar {
  height: 64px;
  border-radius: 12px;
}

@keyframes ui-skeleton-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 0.95;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-skeleton__bar {
    animation: none;
    opacity: 0.7;
  }
}
</style>
