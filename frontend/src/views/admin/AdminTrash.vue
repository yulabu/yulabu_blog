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
        <AdminButton variant="text" @click="router.push('/admin/posts')">返回文章列表</AdminButton>
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
            <AdminButton variant="text" @click="onRestore(row.id)">恢复</AdminButton>
            <AdminButton variant="danger" @click="onForceDelete(row.id)">彻底删除</AdminButton>
          </div>
        </template>
      </AdminDataTable>

      <Pagination v-if="!loading && totalPages > 1" v-model:page="page" :totalPages="totalPages" />
    </AdminPageCard>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageBox } from '@/composables/useMessageBox'
import { useAdminList } from '@/composables/useAdminList'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { getTrashPosts, restorePost, forceDeletePost } from '@/api/admin'
import { formatDateTime } from '@/utils/date'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import Pagination from '@/components/common/Pagination.vue'

const router = useRouter()
const { confirm } = useMessageBox()

const total = ref(0)

const { items: posts, loading, page, totalPages, refresh } = useAdminList(
  async (page, pageSize) => {
    const data = await getTrashPosts(page, pageSize)
    total.value = data.total || 0
    return data
  },
  {
    errorMessage: '获取回收站列表失败',
    extractList: data => data.posts,
    extractTotalPages: data => data.totalPages || 1
  }
)

const columns = [
  { key: 'title', label: '标题' },
  { key: 'category', label: '分类' },
  { key: 'author', label: '作者' },
  { key: 'updatedAt', label: '删除时间' },
  { key: 'actions', label: '操作', class: 'text-center' }
]

const { run: doRestore } = useAsyncAction(restorePost, {
  successMessage: '恢复成功',
  onSuccess: refresh
})

async function onRestore(id) {
  const ok = await confirm('恢复确认', '确定要恢复这篇文章吗？恢复后将回到文章列表。')
  if (!ok) return
  doRestore(id)
}

const { confirmDelete: onForceDelete } = useConfirmDelete(forceDeletePost, {
  title: '彻底删除确认',
  message: '彻底删除后无法恢复，确定要删除这篇文章吗？',
  successMessage: '已彻底删除',
  onSuccess: refresh
})
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

.text-muted {
  color: rgb(120, 140, 125);
}
</style>
