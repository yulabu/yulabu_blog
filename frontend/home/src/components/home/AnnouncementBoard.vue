<template>
  <GlassPanel class="card">
    <div class="header">
      <span class="heading-icon">
        <Icon icon="material-symbols:campaign-outline" />
      </span>
      <div class="heading-copy">
        <span class="heading-kicker">NOTICE BOARD</span>
        <h4 class="title">公告</h4>
      </div>
      <span class="count" v-if="notices.length">
        <strong>{{ notices.length }}</strong>
        <small>条公告</small>
      </span>
    </div>
    <div class="body">
      <ContentState
        v-if="!notices.length"
        kind="empty"
        size="compact"
        icon="material-symbols:notifications-off-outline"
      >
        暂无公告
      </ContentState>
      <div v-else v-for="item in notices" :key="item.notice_id" class="notice">
        <div class="notice-rail">
          <span class="dot"></span>
          <span class="trail"></span>
        </div>
        <div class="notice-right">
          <div class="notice-head">
            <span class="notice-title">{{ item.notice_title }}</span>
            <span v-if="item.notice_is_pinned" class="notice-pin">
              <Icon icon="material-symbols:push-pin-outline" />
              置顶
            </span>
          </div>
          <span class="notice-date">
            <Icon icon="material-symbols:schedule-outline" />
            {{ formatDate(item.notice_created_at) }}
          </span>
          <p class="notice-content">{{ item.notice_content }}</p>
        </div>
      </div>
    </div>
  </GlassPanel>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { formatDate } from '@/utils/date'
import { getPublicNotices } from '@/api/notice'
import { useMessageBox } from '@/composables/useMessageBox'
import ContentState from '@/components/common/ContentState.vue'
import GlassPanel from '@/components/common/GlassPanel.vue'

const notices = ref([])
const { toast } = useMessageBox()
const emit = defineEmits(['loaded'])

async function fetchNotices() {
  try {
    const data = await getPublicNotices()
    notices.value = data.notices || []
  } catch (e) {
    toast('获取公告失败', 'error')
  } finally {
    emit('loaded')
  }
}

onMounted(fetchNotices)
</script>
<style scoped>
.card {
  width: 100%;
  padding: 18px;
  border-radius: 20px;
}

.header {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-divider);
  margin-bottom: 5px;
}

.heading-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(var(--color-primary-rgb), .16);
  border-radius: 10px;
  background: rgba(var(--color-primary-rgb), .1);
  color: var(--color-primary);
  font-size: 18px;
}

.heading-copy {
  min-width: 0;
}

.heading-kicker {
  display: block;
  margin-bottom: 4px;
  color: var(--color-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .16em;
  line-height: 1;
}

.title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-weight: 600;
  color: var(--color-heading);
  font-size: 17px;
  line-height: 1.2;
  margin: 0;
}

.count {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: auto;
  color: var(--color-muted);
  font-size: 9px;
  white-space: nowrap;
}

.count strong {
  color: var(--color-heading);
  font-family: Georgia, serif;
  font-size: 19px;
  line-height: 1;
}

.count small {
  margin-top: 3px;
  font-size: 9px;
}

.body {
  display: flex;
  flex-direction: column;
}

.notice {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 10px;
  padding: 13px 0;
}

.notice:not(:last-child) {
  border-bottom: 1px dashed var(--border-divider);
}

.notice-rail {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 5px;
}

.dot {
  display: block;
  position: relative;
  z-index: 1;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(var(--color-primary-rgb), .1),
    0 0 8px rgba(var(--color-primary-rgb), .4);
}

.trail {
  position: absolute;
  top: 16px;
  bottom: -13px;
  left: 50%;
  width: 1px;
  background: var(--border-divider);
}

.notice:last-child .trail {
  display: none;
}

.notice-right {
  flex: 1;
  min-width: 0;
}

.notice-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 3px;
}

.notice-title {
  min-width: 0;
  overflow: hidden;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: var(--color-heading);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-pin {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 3px;
  padding: 2px 5px;
  border-radius: 5px;
  background: rgba(224, 163, 70, .14);
  color: rgb(178, 123, 42);
  font-size: 9px;
}

.notice-pin :deep(svg) {
  font-size: 11px;
}

.notice-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 5px;
  font-size: 11px;
  color: var(--color-text);
  opacity: .65;
  white-space: nowrap;
}

.notice-date :deep(svg) {
  font-size: 13px;
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

</style>
