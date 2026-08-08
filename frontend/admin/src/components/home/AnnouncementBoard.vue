<template>
  <div class="card">
    <div class="header">
      <Icon icon="material-symbols:campaign-outline" class="icon" />
      <h4 class="title">公告</h4>
      <span class="count" v-if="notices.length">共 {{ notices.length }} 条</span>
    </div>
    <div class="body">
      <div v-if="!notices.length" class="empty">
        <Icon icon="material-symbols:notifications-off-outline" class="empty-icon" />
        <span>暂无公告</span>
      </div>
      <div v-else v-for="item in notices" :key="item.notice_id" class="notice">
        <div class="notice-left">
          <span class="dot"></span>
        </div>
        <div class="notice-right">
          <div class="notice-head">
            <span class="notice-title">{{ item.notice_title }}</span>
            <span class="notice-date">{{ formatDate(item.notice_created_at) }}</span>
          </div>
          <p class="notice-content">{{ item.notice_content }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { formatDate } from '@/utils/date'
import { getPublicNotices } from '@/api/notice'
import { useMessageBox } from '@/composables/useMessageBox'

const notices = ref([])
const { toast } = useMessageBox()

async function fetchNotices() {
  try {
    const data = await getPublicNotices()
    notices.value = data.notices || []
  } catch (e) {
    toast('获取公告失败', 'error')
  }
}

onMounted(fetchNotices)
</script>
<style scoped>
.card {
  width: 100%;
  padding: 24px 20px;
  border-radius: 5%;
  box-shadow: 0 4px 12px var(--shadow-color);
  border-top: 1px solid var(--border-light);
  border-left: 1px solid var(--border-light);
  background: linear-gradient(to right bottom,
      var(--bg-glass-start),
      var(--bg-glass-mid),
      var(--bg-glass-end));
  backdrop-filter: blur(16px);
}

.header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border-divider);
  margin-bottom: 16px;
}

.icon {
  color: var(--color-primary);
  font-size: 22px;
}

.title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-weight: 700;
  color: var(--color-primary);
  font-size: 20px;
  margin: 0;
  letter-spacing: 2px;
}

.count {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text);
  background: rgba(var(--color-accent-rgb), .12);
  padding: 2px 8px;
  border-radius: 10px;
}

.body {
  display: flex;
  flex-direction: column;
}

.notice {
  display: flex;
  gap: 10px;
  padding: 10px 0;
}

.notice:not(:last-child) {
  border-bottom: 1px dashed var(--border-divider);
}

.notice-left {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  padding-top: 6px;
}

.dot {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 6px rgba(var(--color-primary-rgb), .4);
}

.notice-right {
  flex: 1;
  min-width: 0;
}

.notice-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.notice-title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-weight: 900;
  font-size: 14px;
  color: var(--color-primary);
}

.notice-date {
  margin-left: auto;
  font-size: 11px;
  color: var(--color-text);
  opacity: .65;
  white-space: nowrap;
  flex-shrink: 0;
}

.notice-content {
  margin: 0;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 12px;
  color: var(--color-text);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  color: var(--color-text);
  opacity: .45;
  font-size: 13px;
  gap: 8px;
}

.empty-icon {
  font-size: 32px;
}
</style>