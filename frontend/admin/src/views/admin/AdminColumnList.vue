<template>
  <div class="column-list-page">
    <AdminPageCard
      title="专栏管理"
      :loading="loading"
      :empty="!loading && columns.length === 0"
      empty-text="暂无专栏"
    >
      <template #search>
        <AdminSearchBar placeholder="搜索专栏..." @search="onSearch" />
      </template>
      <template #actions>
        <AdminButton variant="primary" @click="openModal()">新建专栏</AdminButton>
      </template>

      <AdminDataTable :columns="columnsDef" :data="filteredColumns">
        <template #cell-name="{ row }">
          <AdminDataTableCellTitle :title="row.name" :truncate="false" />
        </template>
        <template #cell-cover="{ row }">
          <img
            v-if="row.cover"
            :src="row.cover"
            :alt="row.name"
            class="cover-thumb"
          />
          <span v-else class="cover-empty">无封面</span>
        </template>
        <template #cell-desc="{ row }">
          <AdminDataTableCellText muted>{{ row.desc || '—' }}</AdminDataTableCellText>
        </template>
        <template #cell-post_count="{ row }">
          <span class="post-count">{{ row.post_count }}</span>
        </template>
        <template #cell-sort_order="{ row }">
          <span class="text-center">{{ row.sort_order }}</span>
        </template>
        <template #cell-status="{ row }">
          <AdminStatusBadge :type="row.status" />
        </template>
        <template #cell-actions="{ row }">
          <AdminDataTableCellActions>
            <AdminButton variant="text" @click="goPosts(row)">管理文章</AdminButton>
            <AdminButton variant="text" @click="openModal(row)">编辑</AdminButton>
            <AdminButton variant="danger" @click="onDelete(row.id)">删除</AdminButton>
          </AdminDataTableCellActions>
        </template>
      </AdminDataTable>
    </AdminPageCard>

    <AdminModal
      v-model:visible="modalVisible"
      :title="editingColumn ? '编辑专栏' : '新建专栏'"
      confirm-text="确定"
      @confirm="onSave"
    >
      <AdminFormField label="名称" required>
        <AdminFormInput
          ref="nameInputRef"
          v-model="form.name"
          placeholder="请输入专栏名称"
          @keyup.enter="onSave"
        />
      </AdminFormField>

      <AdminFormField label="简介" hint="不超过128字，可选">
        <AdminFormInput
          v-model="form.desc"
          type="textarea"
          :rows="3"
          placeholder="请输入专栏简介"
        />
      </AdminFormField>

      <AdminFormField label="封面图" hint="图片URL，可选">
        <AdminFormInput
          v-model="form.cover"
          placeholder="请输入封面图URL"
        />
      </AdminFormField>

      <AdminFormField label="排序" hint="数值越小越靠前">
        <AdminFormInput
          v-model.number="form.sort_order"
          type="number"
          placeholder="0"
        />
      </AdminFormField>

      <AdminFormField label="状态">
        <AdminFormSelect
          v-model="form.status"
          :options="statusOptions"
        />
      </AdminFormField>
    </AdminModal>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageBox } from '@/composables/useMessageBox'
import { useAdminList } from '@/composables/useAdminList'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import { getAdminColumns, createColumn, updateColumn, deleteColumn } from '@/api/column'
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

const router = useRouter()
const { toast } = useMessageBox()
const searchQuery = ref('')

const { items: columns, loading, refresh } = useAdminList(getAdminColumns, {
  paginated: false,
  errorMessage: '获取专栏列表失败'
})

const filteredColumns = computed(() => {
  if (!searchQuery.value) return columns.value
  const q = searchQuery.value.toLowerCase()
  return columns.value.filter(c => c.name.toLowerCase().includes(q))
})

const columnsDef = [
  { key: 'name', label: '名称' },
  { key: 'cover', label: '封面' },
  { key: 'desc', label: '简介' },
  { key: 'post_count', label: '文章数', class: 'text-center' },
  { key: 'sort_order', label: '排序', class: 'text-center' },
  { key: 'status', label: '状态', class: 'text-center' },
  { key: 'actions', label: '操作', class: 'text-center' }
]

const modalVisible = ref(false)
const editingColumn = ref(null)
const form = ref({
  name: '',
  desc: '',
  cover: '',
  sort_order: 0,
  status: 'show'
})
const nameInputRef = ref(null)

const statusOptions = [
  { value: 'show', label: '显示' },
  { value: 'hide', label: '隐藏' }
]

function onSearch(q) {
  searchQuery.value = q
}

function goPosts(row) {
  router.push(`/admin/columns/${row.id}/posts`)
}

function openModal(column = null) {
  editingColumn.value = column
  if (column) {
    form.value = {
      name: column.name,
      desc: column.desc || '',
      cover: column.cover || '',
      sort_order: column.sort_order,
      status: column.status
    }
  } else {
    form.value = { name: '', desc: '', cover: '', sort_order: 0, status: 'show' }
  }
  modalVisible.value = true
  nextTick(() => {
    nameInputRef.value?.focus()
  })
}

function closeModal() {
  modalVisible.value = false
  editingColumn.value = null
}

async function onSave() {
  const name = form.value.name.trim()
  if (!name) {
    toast('专栏名称不能为空', 'error')
    return
  }

  try {
    const payload = {
      column_name: name,
      column_desc: form.value.desc.trim() || undefined,
      column_cover: form.value.cover.trim() || undefined,
      sort_order: form.value.sort_order,
      status: form.value.status
    }

    if (editingColumn.value) {
      await updateColumn(editingColumn.value.id, payload)
    } else {
      await createColumn(payload)
    }

    toast(editingColumn.value ? '保存成功' : '创建成功')
    closeModal()
    refresh()
  } catch (e) {
    toast(e.message || '保存失败', 'error')
  }
}

const { confirmDelete: onDelete } = useConfirmDelete(deleteColumn, {
  message: '确定要删除这个专栏吗？专栏内文章不会被删除。',
  successMessage: '删除成功',
  onSuccess: refresh
})
</script>

<style scoped>
.column-list-page {
  width: 100%;
}

.cover-thumb {
  width: 88px;
  height: 52px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid rgba(80, 140, 134, 0.25);
  display: block;
}

.cover-empty {
  font-size: 12px;
  color: var(--color-muted);
}

.post-count {
  display: inline-block;
  min-width: 24px;
  text-align: center;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(var(--color-accent-rgb), 0.12);
  color: var(--color-text);
  font-size: 12px;
}
</style>