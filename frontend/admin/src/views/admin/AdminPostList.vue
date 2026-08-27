<template>
  <div class="post-list-page">
    <AdminPageCard
      title="文章管理"
      subtitle="管理全部文章（已发布 / 草稿 / 回收站）"
      :loading="loading"
      :empty="!loading && posts.length === 0"
    >
      <template #search>
        <AdminSearchBar placeholder="搜索文章标题..." @search="onSearch" />
      </template>
      <template #actions>
        <div class="filter-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="tab-btn"
            :class="{ active: activeTab === tab.value }"
            @click="onTabChange(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>
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
            <template v-if="row.status === 'trash'">
              <AdminButton variant="text" @click="onRestore(row.id)">恢复</AdminButton>
              <AdminButton variant="danger" @click="onForceDelete(row.id)">彻底删除</AdminButton>
            </template>
            <AdminButton v-else variant="danger" @click="onDelete(row.id)">删除</AdminButton>
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
import { useMessageBox } from '@/composables/useMessageBox'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { getAdminPosts, deletePost, restorePost, forceDeletePost } from '@/api/post'
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
const { confirm } = useMessageBox()
const searchQuery = ref('')

const tabs = [
  { label: '全部', value: '' },
  { label: '已发布', value: 'published' },
  { label: '草稿', value: 'draft' },
  { label: '回收站', value: 'trash' }
]
const activeTab = ref('')

const { items: posts, loading, page, totalPages, fetch, refresh } = useAdminList(
  (pageNum, pageSize) => getAdminPosts(pageNum, pageSize, activeTab.value || undefined, searchQuery.value),
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

function onTabChange(value) {
  activeTab.value = value
  page.value = 1
  fetch()
}

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

const { run: doRestore } = useAsyncAction(restorePost, {
  successMessage: '恢复成功',
  onSuccess: refresh
})

async function onRestore(id) {
  const ok = await confirm('恢复确认', '确定要恢复这篇文章吗？恢复后将回到已发布列表。')
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
.post-list-page {
  width: 100%;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  padding: 4px;
}

.tab-btn {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.tab-btn:hover {
  color: var(--color-heading);
}

.tab-btn.active {
  background: #ffffff;
  color: var(--color-heading);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
</style>