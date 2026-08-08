<template>
  <div class="admin-page-card">
    <div class="admin-page-card__header">
      <div>
        <h2 class="admin-page-card__title">{{ title }}</h2>
        <p v-if="subtitle" class="admin-page-card__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.search" class="admin-page-card__search">
        <slot name="search" />
      </div>
      <div v-if="$slots.actions" class="admin-page-card__actions">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="loading" class="admin-page-card__loading">
      <slot name="loading">加载中...</slot>
    </div>

    <div v-else-if="empty" class="admin-page-card__empty">
      <slot name="empty">{{ emptyText }}</slot>
    </div>

    <slot v-else />
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  empty: {
    type: Boolean,
    default: false
  },
  emptyText: {
    type: String,
    default: '暂无数据'
  }
})
</script>

<style scoped>
.admin-page-card {
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-top: 1px solid white;
  border-left: 1px solid white;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, .6),
      rgba(255, 255, 255, .3),
      rgba(255, 255, 255, .2));
  backdrop-filter: blur(16px);
}

.admin-page-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.admin-page-card__title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.admin-page-card__subtitle {
  font-size: 13px;
  color: var(--color-muted);
  margin-top: 4px;
}

.admin-page-card__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-page-card__search {
  flex: 1;
  max-width: 280px;
  margin: 0 16px;
}

.admin-page-card__loading,
.admin-page-card__empty {
  padding: 40px 0;
  text-align: center;
  color: var(--color-text);
}
</style>
