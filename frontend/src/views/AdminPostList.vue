<template>
  <div class="post-list-page">
    <div class="card">
      <div class="card-header">
        <h2 class="title">文章管理</h2>
        <button class="btn-primary" @click="goNew">新建文章</button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>

      <table v-else class="post-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>分类</th>
            <th>作者</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="post in posts" :key="post.id">
            <td class="td-title">{{ post.title }}</td>
            <td>
              <span v-if="post.category" class="category-tag">{{ post.category.name }}</span>
              <span v-else class="text-muted">-</span>
            </td>
            <td>{{ post.author }}</td>
            <td>
              <span class="status" :class="post.status">{{ statusText(post.status) }}</span>
            </td>
            <td class="text-muted">{{ formatDate(post.createdAt) }}</td>
            <td>
              <div class="actions">
                <button class="btn-text" @click="goEdit(post.id)">编辑</button>
                <button class="btn-text danger" @click="onDelete(post.id)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <Pagination v-if="!loading && totalPages > 1" v-model:page="page" :totalPages="totalPages" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageBox } from '@/composables/useMessageBox'
import { authFetch } from '@/utils/request'
import Pagination from '@/components/Pagination.vue'

const router = useRouter()
const { confirm, toast } = useMessageBox()

const posts = ref([])
const page = ref(1)
const totalPages = ref(1)
const loading = ref(false)

async function fetchPosts() {
  loading.value = true
  try {
    const res = await authFetch(`/api/posts?limit=10&page=${page.value}`)
    if (!res.ok) throw new Error('获取文章列表失败')
    const data = await res.json()
    posts.value = data.posts
    totalPages.value = data.totalPages || 1
  } catch (e) {
    console.error(e)
    toast('获取文章列表失败', 'error')
  } finally {
    loading.value = false
  }
}

watch(page, fetchPosts, { immediate: true })

function goNew() {
  router.push('/admin/posts/new')
}

function goEdit(id) {
  router.push(`/admin/posts/${id}/edit`)
}

async function onDelete(id) {
  const ok = await confirm('删除确认', '确定要删除这篇文章吗？删除后可在回收站恢复。')
  if (!ok) return

  try {
    const res = await authFetch(`/api/posts/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('删除失败')
    toast('删除成功')
    fetchPosts()
  } catch (e) {
    console.error(e)
    toast('删除失败', 'error')
  }
}

function statusText(status) {
  return status === 'published' ? '已发布' : '回收站'
}

function formatDate(str) {
  if (!str) return '-'
  const d = new Date(str)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.post-list-page {
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

.post-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.post-table th,
.post-table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px dashed rgba(80, 140, 134, 0.2);
}

.post-table th {
  color: rgb(45, 90, 65);
  font-weight: 600;
  background: rgba(99, 149, 86, 0.08);
}

.post-table tbody tr:hover {
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

.category-tag {
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(99, 149, 86, 0.85);
  color: white;
  font-size: 12px;
}

.status {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 12px;
}

.status.published {
  background: rgba(99, 149, 86, 0.15);
  color: rgb(45, 90, 65);
}

.status.trash {
  background: rgba(120, 120, 120, 0.15);
  color: rgb(100, 100, 100);
}

.actions {
  display: flex;
  gap: 10px;
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
