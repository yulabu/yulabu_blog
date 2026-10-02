<template>
  <span class="ui-chip" :class="[`ui-chip--${variant}`, `ui-chip--${size}`]"><slot /></span>
</template>

<script setup>
/**
 * 分类 chip 的唯一实现。
 *
 * 改前散在四处、数值还不一致：ArchiveView（3px 10px / 12px）、ColumnDetailView
 * （2px 10px / 11px）、PostDetailView（实心白字）各写一份 CSS。PostList 里画在
 * 封面图上的那种 tag 用途不同（图上叠字），不在这里。
 *
 * variant: soft 浅底（列表里最常用）/ solid 实心（文章页 meta 行，压在白底上要更实）
 * size:    md 12px / sm 11px（专栏目录行更紧凑）
 */
defineProps({
  variant: { type: String, default: 'soft' },
  size: { type: String, default: 'md' }
})
</script>

<style scoped>
/* 不改 display：原实现都是 inline 的 span，改 inline-block 会影响行盒高度 */
.ui-chip {
  border-radius: 10px;
}

.ui-chip--soft {
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-text);
}

.ui-chip--solid {
  background: var(--color-primary);
  color: white;
}

.ui-chip--md {
  padding: 3px 10px;
  font-size: 12px;
}

.ui-chip--sm {
  padding: 2px 10px;
  font-size: 11px;
}
</style>
