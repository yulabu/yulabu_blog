<template>
  <div class="post-list-page">
    <AdminPageCard
      title="文章管理"
      subtitle="管理已发布的文章"
      :loading="loading"
      :empty="!loading && posts.length === 0"
    >
      <template #actions>
        <AdminButton variant="text" @click="router.push('/admin/trash')">回收站</AdminButton>
        <AdminButton variant="primary" @click="goNew">新建文章</AdminButton>
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
            <AdminButton variant="text" @click="goEdit(row.id)">编辑</AdminButton>
            <AdminButton variant="danger" @click="onDelete(row.id)">删除</AdminButton>
          </div>
        </template>
      </AdminDataTable>

      <Pagination v-if="!loading && totalPages > 1" v-model:page="page" :totalPages="totalPages" />
    </AdminPageCard>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAdminList } from '@/composables/useAdminList'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import { getPosts, deletePost } from '@/api/post'
import { formatDate } from '@/utils/date'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import Pagination from '@/components/common/Pagination.vue'

const router = useRouter()

const { items: posts, loading, page, totalPages, refresh } = useAdminList(getPosts, {
  errorMessage: '获取文章列表失败',
  extractList: data => data.posts,
  extractTotalPages: data => data.totalPages || 1
})

const columns = [
  { key: 'title', label: '标题' },
  { key: 'category', label: '分类' },
  { key: 'author', label: '作者' },
  { key: 'status', label: '状态' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'actions', label: '操作', class: 'text-center' }
]

function goNew() {
  router.push('/admin/posts/new')
}

function goEdit(id) {
  router.push(`/admin/posts/${id}/edit`)
}

const { confirmDelete: onDelete } = useConfirmDelete(deletePost, {
  message: '确定要删除这篇文章吗？删除后可在回收站恢复。',
  successMessage: '删除成功',
  onSuccess: refresh
})

</script>

<style scoped>
.post-list-page {
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
