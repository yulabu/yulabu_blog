<template>
  <div class="backup-list-page">
    <AdminPageCard
      title="备份管理"
      :subtitle="uploadsSubtitle"
      :loading="loading"
      :empty="!loading && backups.length === 0"
      empty-text="暂无备份，点击右上角「立即备份」创建"
    >
      <template #actions>
        <AdminButton variant="primary" :loading="backupLoading" @click="onBackupNow">立即备份</AdminButton>
      </template>

      <AdminDataTable :columns="columns" :data="backups" row-key="filename">
        <template #cell-filename="{ row }">
          <span class="dump-name">{{ row.filename }}</span>
        </template>
        <template #cell-size="{ row }">
          {{ formatSize(row.size) }}
        </template>
        <template #cell-createdAt="{ row }">
          {{ formatDateTimeFull(row.createdAt) }}
        </template>
        <template #cell-actions="{ row }">
          <AdminDataTableCellActions>
            <AdminButton
              variant="text"
              :disabled="exportingId !== null && exportingId !== row.filename"
              @click="onExport(row)"
            >
              {{ exportingId === row.filename ? '打包中...' : '导出' }}
            </AdminButton>
            <AdminButton variant="danger" :loading="deleteLoading" @click="onDelete(row)">删除</AdminButton>
          </AdminDataTableCellActions>
        </template>
      </AdminDataTable>
    </AdminPageCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMessageBox } from '@/composables/useMessageBox'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { getBackups, createBackup, deleteBackup as deleteBackupApi, downloadBackup } from '@/api/backup'
import { formatDateTimeFull } from '@/utils/date'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import AdminDataTableCellActions from '@/components/admin/data-table/AdminDataTableCellActions.vue'

const { toast } = useMessageBox()

// 返回体是「备份列表 + 镜像统计」的组合，不适配 useAdminList 的单列表契约，此处手动拉取
const backups = ref([])
const uploadsStats = ref(null)
const loading = ref(false)

async function fetchList() {
  loading.value = true
  try {
    const data = await getBackups()
    backups.value = data.backups ?? []
    uploadsStats.value = data.uploads
  } catch (e) {
    toast('获取备份列表失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

const uploadsSubtitle = computed(() => {
  if (!uploadsStats.value) return ''
  const { fileCount, totalSize, syncedAt } = uploadsStats.value
  const time = syncedAt ? `，更新于 ${formatDateTimeFull(syncedAt)}` : ''
  return `图片镜像 ${fileCount} 个文件 · ${formatSize(totalSize)}${time}`
})

const columns = [
  { key: 'filename', label: '备份文件' },
  { key: 'size', label: '大小', class: 'text-center' },
  { key: 'createdAt', label: '备份时间' },
  { key: 'actions', label: '操作', class: 'text-center' }
]

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

// 立即备份（导出整库 + 图片镜像，可能耗时较长，按钮 loading 由 useAsyncAction 守卫）
const { run: runBackupNow, loading: backupLoading } = useAsyncAction(createBackup, {
  successMessage: (result) => result.message,
  onSuccess: fetchList
})

function onBackupNow() {
  return runBackupNow()
}

const { confirmDelete: onDelete, loading: deleteLoading } = useConfirmDelete(
  (row) => deleteBackupApi(row.filename),
  {
    message: (row) => `确定要删除备份 ${row.filename} 吗？`,
    successMessage: '删除成功',
    onSuccess: fetchList
  }
)

// 逐行导出 loading：正在打包的行显示「打包中...」，其余行导出按钮置灰
const exportingId = ref(null)
const { run: runDownload } = useAsyncAction(downloadBackup, {
  successMessage: '备份包已开始下载'
})

async function onExport(row) {
  if (exportingId.value !== null) return
  exportingId.value = row.filename
  try {
    await runDownload(row.filename)
  } finally {
    exportingId.value = null
  }
}
</script>

<style scoped>
.backup-list-page {
  width: 100%;
}

.dump-name {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
}
</style>
