<template>
  <div class="moment-list-page">
    <AdminPageCard
      title="碎碎念管理"
      :loading="loading"
      :empty="!loading && moments.length === 0"
      empty-text="暂无碎碎念"
    >
      <template #search>
        <AdminSearchBar placeholder="搜索碎碎念..." @search="onSearch" />
      </template>
      <template #actions>
        <AdminButton variant="primary" @click="openModal()">新建碎碎念</AdminButton>
      </template>

      <AdminDataTable :columns="columns" :data="moments">
        <template #cell-content="{ row }">
          <AdminDataTableCellTitle :title="row.content" />
        </template>
        <template #cell-image="{ row }">
          <img v-if="row.image" :src="row.image" class="moment-thumb" />
          <span v-else class="moment-no-img">—</span>
        </template>
        <template #cell-status="{ row }">
          <AdminStatusBadge :type="row.status" />
        </template>
        <template #cell-created_at="{ row }">
          <AdminDataTableCellText muted>{{ formatDateTime(row.created_at) }}</AdminDataTableCellText>
        </template>
        <template #cell-actions="{ row }">
          <AdminDataTableCellActions>
            <AdminButton variant="text" @click="openModal(row)">编辑</AdminButton>
            <AdminButton variant="danger" @click="onDelete(row.id)">删除</AdminButton>
          </AdminDataTableCellActions>
        </template>
      </AdminDataTable>

      <Pagination
        v-if="!loading && totalPages > 1"
        v-model:page="page"
        :total-pages="totalPages"
      />
    </AdminPageCard>

    <AdminModal
      v-model:visible="modalVisible"
      :title="editingMoment ? '编辑碎碎念' : '新建碎碎念'"
      width="480px"
      :confirm-loading="saving"
      @confirm="onSave"
    >
      <AdminFormField label="内容" required>
        <AdminFormInput
          ref="contentInputRef"
          v-model="form.content"
          type="textarea"
          :rows="5"
          placeholder="写点什么..."
        />
      </AdminFormField>

      <AdminFormField label="配图" hint="支持 jpg/png/webp，可选">
        <div v-if="editingMoment && form.currentImage" class="image-row">
          <img :src="form.currentImage" class="current-image" />
          <AdminButton variant="danger" @click="onRemoveImage">移除配图</AdminButton>
        </div>
        <AdminFormFile v-model="form.imageFile" accept="image/*" />
      </AdminFormField>

      <AdminFormField label="状态">
        <AdminFormSelect v-model="form.status" :options="statusOptions" />
      </AdminFormField>
    </AdminModal>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useMessageBox } from '@/composables/useMessageBox'
import { useAdminList } from '@/composables/useAdminList'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import { getAdminMoments, createMoment, updateMoment, deleteMoment, uploadMomentImage, removeMomentImage } from '@/api/moment'
import { formatDateTime } from '@/utils/date'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminSearchBar from '@/components/admin/AdminSearchBar.vue'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminModal from '@/components/admin/AdminModal.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge.vue'
import AdminDataTableCellTitle from '@/components/admin/data-table/AdminDataTableCellTitle.vue'
import AdminDataTableCellActions from '@/components/admin/data-table/AdminDataTableCellActions.vue'
import AdminDataTableCellText from '@/components/admin/data-table/AdminDataTableCellText.vue'
import AdminFormField from '@/components/admin/forms/AdminFormField.vue'
import AdminFormInput from '@/components/admin/forms/AdminFormInput.vue'
import AdminFormSelect from '@/components/admin/forms/AdminFormSelect.vue'
import AdminFormFile from '@/components/admin/forms/AdminFormFile.vue'
import Pagination from '@/components/common/Pagination.vue'

const { toast } = useMessageBox()
const searchQuery = ref('')

const { items: moments, loading, page, totalPages, fetch, refresh } = useAdminList(
  (pageNum, pageSize) => getAdminMoments(pageNum, pageSize, searchQuery.value),
  {
    errorMessage: '获取碎碎念列表失败',
    extractList: data => data.moments,
    extractTotalPages: data => data.totalPages || 1
  }
)

const columns = [
  { key: 'content', label: '内容' },
  { key: 'image', label: '配图', class: 'text-center' },
  { key: 'status', label: '状态', class: 'text-center' },
  { key: 'created_at', label: '创建时间' },
  { key: 'actions', label: '操作', class: 'text-center' }
]

function onSearch(q) {
  searchQuery.value = q
  page.value = 1
  fetch()
}

const modalVisible = ref(false)
const editingMoment = ref(null)
const saving = ref(false)
const form = ref({ content: '', status: 'show', imageFile: null, currentImage: '' })
const contentInputRef = ref(null)

const statusOptions = [
  { value: 'show', label: '显示' },
  { value: 'hide', label: '隐藏' }
]

function openModal(moment = null) {
  editingMoment.value = moment
  if (moment) {
    form.value = {
      content: moment.content,
      status: moment.status,
      imageFile: null,
      currentImage: moment.image || ''
    }
  } else {
    form.value = { content: '', status: 'show', imageFile: null, currentImage: '' }
  }
  modalVisible.value = true
  nextTick(() => {
    contentInputRef.value?.focus()
  })
}

function closeModal() {
  modalVisible.value = false
  editingMoment.value = null
  form.value = { content: '', status: 'show', imageFile: null, currentImage: '' }
}

async function onSave() {
  const content = form.value.content.trim()
  if (!content) {
    toast('内容不能为空', 'error')
    return
  }

  saving.value = true
  try {
    if (editingMoment.value) {
      await updateMoment(editingMoment.value.id, {
        moment_content: content,
        moment_status: form.value.status
      })
      if (form.value.imageFile && form.value.imageFile.length > 0) {
        await uploadMomentImage(editingMoment.value.id, form.value.imageFile[0])
      }
    } else {
      const { id } = await createMoment({
        moment_content: content,
        moment_status: form.value.status
      })
      if (form.value.imageFile && form.value.imageFile.length > 0) {
        await uploadMomentImage(id, form.value.imageFile[0])
      }
    }

    toast(editingMoment.value ? '保存成功' : '创建成功')
    closeModal()
    refresh()
  } catch (e) {
    toast(e.message || '保存失败', 'error')
  } finally {
    saving.value = false
  }
}

async function onRemoveImage() {
  if (!editingMoment.value) return
  try {
    await removeMomentImage(editingMoment.value.id)
    form.value.currentImage = ''
    toast('配图已移除')
    refresh()
  } catch (e) {
    toast(e.message || '移除失败', 'error')
  }
}

const { confirmDelete: onDelete } = useConfirmDelete(deleteMoment, {
  message: '确定要删除这条碎碎念吗？',
  successMessage: '删除成功',
  onSuccess: refresh
})
</script>

<style scoped>
.moment-list-page {
  width: 100%;
}

.moment-thumb {
  width: 88px;
  height: 52px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid rgba(80, 140, 134, 0.25);
  display: block;
}

.moment-no-img {
  font-size: 12px;
  color: var(--color-muted);
}

.image-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.current-image {
  width: 120px;
  height: 72px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid rgba(80, 140, 134, 0.25);
}
</style>
