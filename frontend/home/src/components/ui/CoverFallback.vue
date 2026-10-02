<template>
  <div class="ui-cover-fallback" :class="`ui-cover-fallback--${variant}`">{{ text }}</div>
</template>

<script setup>
/**
 * 无封面时的首字兜底（唯一实现）。
 *
 * 改前有 3 份逐字相同的 CSS（ColumnsView 的 .cover-fallback、FriendsView 的
 * .preview-fallback、ColumnDetailView 的 .header-cover.fallback）——前两者连字体
 * 字号都一样，第三份只多了浅底色。
 *
 * 尺寸/圆角由调用方通过 class 给（各处的容器尺寸不同），这里只管居中的那个字。
 * variant: plain 透明底（容器自带底色）/ tinted 浅绿底（专栏头部那种）
 */
defineProps({
  text: { type: String, default: '' },
  variant: { type: String, default: 'plain' }
})
</script>

<style scoped>
.ui-cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: rgba(var(--color-primary-rgb), 0.4);
}

.ui-cover-fallback--plain {
  width: 100%;
  height: 100%;
  font-size: 56px;
}

.ui-cover-fallback--tinted {
  font-size: 40px;
  background: rgba(var(--color-primary-rgb), 0.08);
}
</style>
