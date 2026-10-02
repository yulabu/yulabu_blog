<template>
  <div class="ui-section-header">
    <span class="ui-section-header__line"></span>
    <h4 class="ui-section-header__title"><slot /></h4>
  </div>
</template>

<script setup>
/**
 * 「竖线 + 标题」小节头（唯一实现）。
 * 改前 PostDetailView 的 .toc-header 与 GiscusComments 的 .comments-header
 * 是两份逐字符相同的 CSS（含 .line 与 h4 的四条字体规则）。
 */
</script>

<style scoped>
.ui-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border-divider);
  margin-bottom: 12px;
}

.ui-section-header__line {
  width: 4px;
  height: 18px;
  background: var(--color-primary);
  border-radius: 2px;
}

.ui-section-header__title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-weight: 600;
  color: var(--color-primary);
  font-size: 16px;
  margin: 0;
}
</style>
