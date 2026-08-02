<template>
  <div class="post-list-page">
    <AdminPageCard
      title="文章管理"
      subtitle="管理已发布的文章"
      :loading="loading"
      :empty="!loading && posts.length === 0"
    >
      <template #search>
        <AdminSearchBar placeholder="搜索文章标题..." @search="onSearch" />
      </template>
      <template #actions>
        <AdminButton variant="text" @click="router.push('/admin/trash')">回收站</AdminButton>
        <AdminButton variant="primary" @click="goNew">新建文章</AdminButton>
      </template>

      <AdminDataTable :columns="columns" :data="posts">
        <template #cell-title="{ row }">
          <AdminDataTableCellTitle :title="row.title" />
        </template>

        <template #cell-category="{ row }">
          <AdminDataTableCellCategory :name="row.category?.name" />
        </template>

        <template #cell-status="{ row }">
          <AdminStatusBadge :type="row.status" />
        </template>

        <template #cell-createdAt="{ row }">
          <AdminDataTableCellText muted>{{ formatDate(row.createdAt) }}</AdminDataTableCellText>
        </template>

        <template #cell-actions="{ row }">
          <AdminDataTableCellActions>
            <AdminButton variant="text" @click="goEdit(row.id)">编辑</AdminButton>
            <AdminButton variant="danger" @click="onDelete(row.id)">删除</AdminButton>
          </AdminDataTableCellActions>
        </template>
      </AdminDataTable>

      <Pagination v-if="!loading && totalPages > 1" v-model:page="page" :totalPages="totalPages" />
    </AdminPageCard>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminList } from '@/composables/useAdminList'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import { getPosts, deletePost } from '@/api/post'
import { formatDate } from '@/utils/date'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminSearchBar from '@/components/admin/AdminSearchBar.vue'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import AdminDataTableCellTitle from '@/components/admin/data-table/AdminDataTableCellTitle.vue'
import AdminDataTableCellCategory from '@/components/admin/data-table/AdminDataTableCellCategory.vue'
import AdminDataTableCellActions from '@/components/admin/data-table/AdminDataTableCellActions.vue'
import AdminDataTableCellText from '@/components/admin/data-table/AdminDataTableCellText.vue'
import Pagination from '@/components/common/Pagination.vue'

const router = useRouter()
const searchQuery = ref('')

const { items: posts, loading, page, totalPages, fetch, refresh } = useAdminList(
  (pageNum, pageSize) => getPosts(pageNum, pageSize, undefined, searchQuery.value),
  {
    errorMessage: '获取文章列表失败',
    extractList: data => data.posts,
    extractTotalPages: data => data.totalPages || 1
  }
)

const columns = [
  { key: 'title', label: '标题' },
  { key: 'category', label: '分类' },
  { key: 'author', label: '作者' },
  { key: 'status', label: '状态' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'actions', label: '操作', class: 'text-center' }
]

function onSearch(q) {
  searchQuery.value = q
  page.value = 1
  fetch()
}

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

</style>
