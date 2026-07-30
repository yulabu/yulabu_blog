<template>
  <div class="trash-page">
    <AdminPageCard
      title="回收站"
      :subtitle="`共 ${total} 篇文章`"
      :loading="loading"
      :empty="!loading && posts.length === 0"
      empty-text="回收站是空的"
    >
      <template #actions>
        <button class="btn-text" @click="router.push('/admin/posts')">返回文章列表</button>
      </template>

      <AdminDataTable :columns="columns" :data="posts">
        <template #cell-title="{ row }">
          <span class="td-title">{{ row.title }}</span>
        </template>

        <template #cell-category="{ row }">
          <span v-if="row.category" class="category-tag">{{ row.category.name }}</span>
          <span v-else class="text-muted">-</span>
        </template>

        <template #cell-updatedAt="{ row }">
          <span class="text-muted">{{ formatDateTime(row.updatedAt) }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="actions">
            <button class="btn-text" @click="onRestore(row.id)">恢复</button>
            <button class="btn-text danger" @click="onForceDelete(row.id)">彻底删除</button>
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
import { getTrashPosts, restorePost, forceDeletePost } from '@/api/admin'
import { formatDateTime } from '@/utils/date'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import Pagination from '@/components/common/Pagination.vue'

const router = useRouter()
const { confirm, toast } = useMessageBox()

const posts = ref([])
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const loading = ref(false)

const columns = [
  { key: 'title', label: '标题' },
  { key: 'category', label: '分类' },
  { key: 'author', label: '作者' },
  { key: 'updatedAt', label: '删除时间' },
  { key: 'actions', label: '操作', class: 'text-center' }
]

async function fetchTrash() {
  loading.value = true
  try {
    const data = await getTrashPosts(page.value, 10)
    posts.value = data.posts
    total.value = data.total || 0
    totalPages.value = data.totalPages || 1
  } catch (e) {
    console.error(e)
    toast('获取回收站列表失败', 'error')
  } finally {
    loading.value = false
  }
}

watch(page, fetchTrash, { immediate: true })

async function onRestore(id) {
  const ok = await confirm('恢复确认', '确定要恢复这篇文章吗？恢复后将回到文章列表。')
  if (!ok) return

  try {
    await restorePost(id)
    toast('恢复成功')
    fetchTrash()
  } catch (e) {
    console.error(e)
    toast('恢复失败', 'error')
  }
}

async function onForceDelete(id) {
  const ok = await confirm('彻底删除确认', '彻底删除后无法恢复，确定要删除这篇文章吗？')
  if (!ok) return

  try {
    await forceDeletePost(id)
    toast('已彻底删除')
    fetchTrash()
  } catch (e) {
    console.error(e)
    toast('删除失败', 'error')
  }
}
</script>

<style scoped>
.trash-page {
  width: 100%;
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
