<template>
  <div class="notice-list-page">
    <AdminPageCard
      title="公告管理"
      :loading="loading"
      :empty="!loading && notices.length === 0"
      empty-text="暂无公告"
    >
      <template #actions>
        <button class="btn-primary" @click="goNew">新建公告</button>
      </template>

      <AdminDataTable :columns="columns" :data="notices" row-key="notice_id">
        <template #cell-notice_title="{ row }">
          <span class="td-title">{{ row.notice_title }}</span>
        </template>

        <template #cell-notice_status="{ row }">
          <span class="status" :class="row.notice_status">
            {{ statusText(row.notice_status) }}
          </span>
        </template>

        <template #cell-notice_is_pinned="{ row }">
          <span class="pin" :class="{ active: row.notice_is_pinned }">
            {{ row.notice_is_pinned ? '置顶' : '普通' }}
          </span>
        </template>

        <template #cell-notice_created_at="{ row }">
          <span class="text-muted">{{ formatDate(row.notice_created_at) }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="actions">
            <button class="btn-text" @click="goEdit(row.notice_id)">编辑</button>
            <button class="btn-text" @click="onTogglePin(row)">
              {{ row.notice_is_pinned ? '取消置顶' : '置顶' }}
            </button>
            <button class="btn-text" @click="onToggleStatus(row)">
              {{ row.notice_status === 'show' ? '隐藏' : '显示' }}
            </button>
            <button class="btn-text danger" @click="onDelete(row.notice_id)">删除</button>
          </div>
        </template>
      </AdminDataTable>
    </AdminPageCard>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageBox } from '@/composables/useMessageBox'
import { getAdminNotices, togglePin, updateNotice, deleteNotice } from '@/api/notice'
import { formatDate } from '@/utils/date'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'

const router = useRouter()
const { confirm, toast } = useMessageBox()

const notices = ref([])
const loading = ref(false)

const columns = [
  { key: 'notice_title', label: '标题' },
  { key: 'notice_status', label: '状态', class: 'text-center' },
  { key: 'notice_is_pinned', label: '置顶', class: 'text-center' },
  { key: 'notice_created_at', label: '创建时间' },
  { key: 'actions', label: '操作', class: 'text-center' }
]

async function fetchNotices() {
  loading.value = true
  try {
    const data = await getAdminNotices()
    notices.value = data.notices
  } catch (e) {
    console.error(e)
    toast('获取公告列表失败', 'error')
  } finally {
    loading.value = false
  }
}

function goNew() {
  router.push('/admin/notices/new')
}

function goEdit(id) {
  router.push(`/admin/notices/${id}/edit`)
}

async function onTogglePin(notice) {
  try {
    await togglePin(notice.notice_id)
    toast(notice.notice_is_pinned ? '已取消置顶' : '已置顶')
    fetchNotices()
  } catch (e) {
    console.error(e)
    toast('操作失败', 'error')
  }
}

async function onToggleStatus(notice) {
  const newStatus = notice.notice_status === 'show' ? 'hide' : 'show'
  try {
    await updateNotice(notice.notice_id, { status: newStatus })
    toast(newStatus === 'show' ? '已显示' : '已隐藏')
    fetchNotices()
  } catch (e) {
    console.error(e)
    toast('操作失败', 'error')
  }
}

async function onDelete(id) {
  const ok = await confirm('删除确认', '确定要删除这条公告吗？')
  if (!ok) return

  try {
    await deleteNotice(id)
    toast('删除成功')
    fetchNotices()
  } catch (e) {
    console.error(e)
    toast('删除失败', 'error')
  }
}

function statusText(status) {
  return status === 'show' ? '显示' : '隐藏'
}

onMounted(fetchNotices)
</script>

<style scoped>
.notice-list-page {
  width: 100%;
}

.btn-primary {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: rgb(99, 149, 86);
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.btn-primary:hover {
  background: rgb(79, 129, 66);
}

.td-title {
  font-weight: 500;
  color: rgb(45, 90, 65);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 12px;
}

.status.show {
  background: rgba(99, 149, 86, 0.15);
  color: rgb(45, 90, 65);
}

.status.hide {
  background: rgba(120, 120, 120, 0.15);
  color: rgb(100, 100, 100);
}

.pin {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 12px;
  background: rgba(120, 120, 120, 0.12);
  color: rgb(100, 100, 100);
}

.pin.active {
  background: rgba(230, 160, 80, 0.2);
  color: rgb(180, 120, 40);
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-text {
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: rgb(99, 149, 86);
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.btn-text:hover {
  background: rgba(99, 149, 86, 0.1);
}

.btn-text.danger {
  color: rgb(200, 80, 80);
}

.btn-text.danger:hover {
  background: rgba(200, 80, 80, 0.1);
}

.text-muted {
  color: rgb(120, 140, 125);
}
</style>
