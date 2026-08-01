<template>
  <div class="tag-list-page">
    <AdminPageCard
      title="标签管理"
      :loading="loading"
      :empty="!loading && tags.length === 0"
    >
      <template #actions>
        <AdminButton variant="primary" @click="openModal()">新建标签</AdminButton>
      </template>

      <AdminDataTable :columns="columns" :data="tags">
        <template #cell-name="{ row }">
          <AdminDataTableCellTitle :title="row.name" :truncate="false" />
        </template>

        <template #cell-actions="{ row }">
          <AdminDataTableCellActions>
            <AdminButton variant="text" @click="openModal(row)">编辑</AdminButton>
            <AdminButton variant="danger" @click="onDelete(row.id)">删除</AdminButton>
          </AdminDataTableCellActions>
        </template>
      </AdminDataTable>
    </AdminPageCard>

    <!-- 弹窗 -->
    <AdminModal
      v-model:visible="modalVisible"
      :title="editingTag ? '编辑标签' : '新建标签'"
      confirm-text="确定"
      @confirm="onSave"
    >
      <AdminFormField label="标签名">
        <AdminFormInput
          ref="inputRef"
          v-model="form.name"
          placeholder="请输入标签名"
          @keyup.enter="onSave"
        />
      </AdminFormField>
    </AdminModal>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useMessageBox } from '@/composables/useMessageBox'
import { useAdminList } from '@/composables/useAdminList'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import { getTags, createTag, updateTag, deleteTag } from '@/api/tag'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminModal from '@/components/admin/AdminModal.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import AdminDataTableCellTitle from '@/components/admin/data-table/AdminDataTableCellTitle.vue'
import AdminDataTableCellActions from '@/components/admin/data-table/AdminDataTableCellActions.vue'
import AdminFormField from '@/components/admin/forms/AdminFormField.vue'
import AdminFormInput from '@/components/admin/forms/AdminFormInput.vue'

const { toast } = useMessageBox()

const { items: tags, loading, refresh } = useAdminList(getTags, {
  paginated: false,
  errorMessage: '获取标签失败'
})

const modalVisible = ref(false)
const editingTag = ref(null)
const form = ref({ name: '' })
const inputRef = ref(null)

const columns = [
  { key: 'name', label: '标签名' },
  { key: 'count', label: '文章数量', class: 'text-center' },
  { key: 'actions', label: '操作', class: 'text-center' }
]

function openModal(tag = null) {
  editingTag.value = tag
  form.value.name = tag ? tag.name : ''
  modalVisible.value = true
  nextTick(() => {
    inputRef.value?.focus()
  })
}

function closeModal() {
  modalVisible.value = false
  editingTag.value = null
  form.value.name = ''
}

async function onSave() {
  const name = form.value.name.trim()
  if (!name) {
    toast('标签名不能为空', 'error')
    return
  }

  if (tags.value.some(t => t.name === name && t.id !== editingTag.value?.id)) {
    toast('该标签已存在', 'error')
    return
  }

  try {
    if (editingTag.value) {
      await updateTag(editingTag.value.id, name)
    } else {
      await createTag(name)
    }

    toast(editingTag.value ? '保存成功' : '创建成功')
    closeModal()
    refresh()
  } catch (e) {
    toast(e.message || '保存失败', 'error')
  }
}

const { confirmDelete: onDelete } = useConfirmDelete(deleteTag, {
  message: '确定要删除这个标签吗？',
  successMessage: '删除成功',
  onSuccess: refresh
})
</script>

<style scoped>
.tag-list-page {
  width: 100%;
}

</style>
