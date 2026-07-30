<template>
  <div class="post-list-page">
    <AdminPageCard
      title="文章管理"
      subtitle="管理已发布的文章"
      :loading="loading"
      :empty="!loading && posts.length === 0"
    >
      <template #actions>
        <button class="btn-text" @click="router.push('/admin/trash')">回收站</button>
        <button class="btn-primary" @click="goNew">新建文章</button>
      </template>

      <AdminDataTable :columns="columns" :data="posts">
        <template #cell-title="{ row }">
          <span class="td-title">{{ row.title }}</span>
        </template>

        <template #cell-category="{ row }">
          <span v-if="row.category" class="category-tag">{{ row.category.name }}</span>
          <span v-else class="text-muted">-</span>
        </template>

        <template #cell-status="{ row }">
          <AdminStatusBadge :type="row.status" />
        </template>

        <template #cell-createdAt="{ row }">
          <span class="text-muted">{{ formatDate(row.createdAt) }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="actions">
            <button class="btn-text" @click="goEdit(row.id)">编辑</button>
            <button class="btn-text danger" @click="onDelete(row.id)">删除</button>
          </div>
        </template>
      </AdminDataTable>

      <Pagination v-if="!loading && totalPages > 1" v-model:page="page" :totalPages="totalPages" />
    </AdminPageCard>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageBox } from '@/composables/useMessageBox'
import { getPosts, deletePost } from '@/api/post'
import { formatDate } from '@/utils/date'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge.vue'
import Pagination from '@/components/common/Pagination.vue'

const router = useRouter()
const { confirm, toast } = useMessageBox()

const posts = ref([])
const page = ref(1)
const totalPages = ref(1)
const loading = ref(false)

const columns = [
  { key: 'title', label: '标题' },
  { key: 'category', label: '分类' },
  { key: 'author', label: '作者' },
  { key: 'status', label: '状态' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'actions', label: '操作', class: 'text-center' }
]

async function fetchPosts() {
  loading.value = true
  try {
    const data = await getPosts(page.value, 10)
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
    await deletePost(id)
    toast('删除成功')
    fetchPosts()
  } catch (e) {
    console.error(e)
    toast('删除失败', 'error')
  }
}

</script>

<style scoped>
.post-list-page {
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

.category-tag {
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(99, 149, 86, 0.85);
  color: white;
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 10px;
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
