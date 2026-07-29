<template>
  <div class="notice-list-page">
    <div class="card">
      <div class="card-header">
        <h2 class="title">公告管理</h2>
        <button class="btn-primary" @click="goNew">新建公告</button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="notices.length === 0" class="empty">暂无公告</div>

      <table v-else class="notice-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>状态</th>
            <th>置顶</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="notice in notices" :key="notice.notice_id">
            <td class="td-title">{{ notice.notice_title }}</td>
            <td>
              <span class="status" :class="notice.notice_status">
                {{ statusText(notice.notice_status) }}
              </span>
            </td>
            <td>
              <span class="pin" :class="{ active: notice.notice_is_pinned }">
                {{ notice.notice_is_pinned ? '置顶' : '普通' }}
              </span>
            </td>
            <td class="text-muted">{{ formatDate(notice.notice_created_at) }}</td>
            <td>
              <div class="actions">
                <button class="btn-text" @click="goEdit(notice.notice_id)">编辑</button>
                <button class="btn-text" @click="onTogglePin(notice)">
                  {{ notice.notice_is_pinned ? '取消置顶' : '置顶' }}
                </button>
                <button class="btn-text" @click="onToggleStatus(notice)">
                  {{ notice.notice_status === 'show' ? '隐藏' : '显示' }}
                </button>
                <button class="btn-text danger" @click="onDelete(notice.notice_id)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageBox } from '@/composables/useMessageBox'
import { getAdminNotices, togglePin, updateNotice, deleteNotice } from '@/api/notice'
import { formatDate } from '@/utils/date'

const router = useRouter()
const { confirm, toast } = useMessageBox()

const notices = ref([])
const loading = ref(false)

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

.card {
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

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: rgb(45, 90, 65);
  margin: 0;
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

.loading {
  padding: 40px 0;
  text-align: center;
  color: rgb(65, 110, 105);
}

.empty {
  padding: 60px 0;
  text-align: center;
  color: rgb(120, 140, 125);
  font-size: 14px;
}

.notice-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.notice-table th,
.notice-table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px dashed rgba(80, 140, 134, 0.2);
}

.notice-table th {
  color: rgb(45, 90, 65);
  font-weight: 600;
  background: rgba(99, 149, 86, 0.08);
}

.notice-table tbody tr:hover {
  background: rgba(99, 149, 86, 0.04);
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
