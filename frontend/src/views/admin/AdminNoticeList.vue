<template>
  <div class="notice-list-page">
    <AdminPageCard
      title="公告管理"
      :loading="loading"
      :empty="!loading && notices.length === 0"
      empty-text="暂无公告"
    >
      <template #actions>
        <AdminButton variant="primary" @click="goNew">新建公告</AdminButton>
      </template>

      <AdminDataTable :columns="columns" :data="notices" row-key="notice_id">
        <template #cell-notice_title="{ row }">
          <AdminDataTableCellTitle :title="row.notice_title" />
        </template>

        <template #cell-notice_status="{ row }">
          <AdminStatusBadge :type="row.notice_status" />
        </template>

        <template #cell-notice_is_pinned="{ row }">
          <AdminStatusBadge :type="row.notice_is_pinned ? 'pinned' : 'normal'" />
        </template>

        <template #cell-notice_created_at="{ row }">
          <AdminDataTableCellText muted>{{ formatDate(row.notice_created_at) }}</AdminDataTableCellText>
        </template>

        <template #cell-actions="{ row }">
          <AdminDataTableCellActions>
            <AdminButton variant="text" @click="goEdit(row.notice_id)">编辑</AdminButton>
            <AdminButton variant="text" @click="onTogglePin(row)">
              {{ row.notice_is_pinned ? '取消置顶' : '置顶' }}
            </AdminButton>
            <AdminButton variant="text" @click="onToggleStatus(row)">
              {{ row.notice_status === 'show' ? '隐藏' : '显示' }}
            </AdminButton>
            <AdminButton variant="danger" @click="onDelete(row.notice_id)">删除</AdminButton>
          </AdminDataTableCellActions>
        </template>
      </AdminDataTable>
    </AdminPageCard>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAdminList } from '@/composables/useAdminList'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { getAdminNotices, togglePin, updateNotice, deleteNotice } from '@/api/notice'
import { formatDate } from '@/utils/date'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import AdminDataTableCellTitle from '@/components/admin/data-table/AdminDataTableCellTitle.vue'
import AdminDataTableCellActions from '@/components/admin/data-table/AdminDataTableCellActions.vue'
import AdminDataTableCellText from '@/components/admin/data-table/AdminDataTableCellText.vue'

const router = useRouter()

const { items: notices, loading, refresh } = useAdminList(getAdminNotices, {
  paginated: false,
  errorMessage: '获取公告列表失败',
  extractList: data => data.notices
})

const columns = [
  { key: 'notice_title', label: '标题' },
  { key: 'notice_status', label: '状态', class: 'text-center' },
  { key: 'notice_is_pinned', label: '置顶', class: 'text-center' },
  { key: 'notice_created_at', label: '创建时间' },
  { key: 'actions', label: '操作', class: 'text-center' }
]

function goNew() {
  router.push('/admin/notices/new')
}

function goEdit(id) {
  router.push(`/admin/notices/${id}/edit`)
}

const { run: doTogglePin } = useAsyncAction(
  (notice) => togglePin(notice.notice_id),
  {
    successMessage: (result, notice) => notice.notice_is_pinned ? '已取消置顶' : '已置顶',
    onSuccess: refresh
  }
)

function onTogglePin(notice) {
  doTogglePin(notice)
}

const { run: doToggleStatus } = useAsyncAction(
  (notice) => updateNotice(notice.notice_id, { status: notice.notice_status === 'show' ? 'hide' : 'show' }),
  {
    successMessage: (result, notice) => notice.notice_status === 'show' ? '已隐藏' : '已显示',
    onSuccess: refresh
  }
)

function onToggleStatus(notice) {
  doToggleStatus(notice)
}

const { confirmDelete: onDelete } = useConfirmDelete(deleteNotice, {
  message: '确定要删除这条公告吗？',
  successMessage: '删除成功',
  onSuccess: refresh
})
</script>

<style scoped>
.notice-list-page {
  width: 100%;
}

</style>
