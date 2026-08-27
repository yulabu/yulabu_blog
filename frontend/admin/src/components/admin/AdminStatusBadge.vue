<template>
  <span class="admin-status-badge" :class="badgeClass">
    {{ badgeText }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    required: true
  }
})

const MAP = {
  published: { text: '已发布', class: 'published' },
  trash: { text: '回收站', class: 'trash' },
  draft: { text: '草稿', class: 'draft' },
  show: { text: '显示', class: 'show' },
  hide: { text: '隐藏', class: 'hide' },
  pinned: { text: '置顶', class: 'pinned' },
  normal: { text: '普通', class: 'normal' }
}

const badge = computed(() => MAP[props.type] || { text: props.type, class: '' })
const badgeText = computed(() => badge.value.text)
const badgeClass = computed(() => badge.value.class)
</script>

<style scoped>
.admin-status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
}

.admin-status-badge.published,
.admin-status-badge.show {
  background: rgba(var(--color-primary-rgb), 0.15);
  color: var(--color-heading);
}

.admin-status-badge.trash,
.admin-status-badge.hide,
.admin-status-badge.normal {
  background: rgba(120, 120, 120, 0.15);
  color: rgb(100, 100, 100);
}

.admin-status-badge.pinned {
  background: rgba(230, 160, 80, 0.2);
  color: rgb(180, 120, 40);
}

.admin-status-badge.draft {
  background: rgba(80, 140, 230, 0.15);
  color: rgb(60, 110, 200);
}
</style>
