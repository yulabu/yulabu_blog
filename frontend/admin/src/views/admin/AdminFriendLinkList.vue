<template>
  <div class="friend-link-list-page">
    <AdminPageCard
      title="友链管理"
      :loading="loading"
      :empty="!loading && links.length === 0"
      empty-text="暂无友链"
    >
      <template #search>
        <AdminSearchBar placeholder="搜索友链..." @search="onSearch" />
      </template>
      <template #actions>
        <AdminButton variant="primary" @click="openModal()">新建友链</AdminButton>
      </template>

      <AdminDataTable :columns="columns" :data="links">
        <template #cell-name="{ row }">
          <AdminDataTableCellTitle :title="row.name" :truncate="false" />
        </template>
        <template #cell-url="{ row }">
          <AdminDataTableCellText muted>{{ row.url }}</AdminDataTableCellText>
        </template>
        <template #cell-status="{ row }">
          <AdminStatusBadge :type="row.status" />
        </template>
        <template #cell-actions="{ row }">
          <AdminDataTableCellActions>
            <AdminButton variant="text" @click="openModal(row)">编辑</AdminButton>
            <AdminButton variant="danger" @click="onDelete(row.id)">删除</AdminButton>
          </AdminDataTableCellActions>
        </template>
      </AdminDataTable>
    </AdminPageCard>

    <AdminModal
      v-model:visible="modalVisible"
      :title="editingLink ? '编辑友链' : '新建友链'"
      confirm-text="确定"
      @confirm="onSave"
    >
      <AdminFormField label="名称" required>
        <AdminFormInput
          ref="nameInputRef"
          v-model="form.name"
          placeholder="请输入友链名称"
          @keyup.enter="onSave"
        />
      </AdminFormField>

      <AdminFormField label="链接" required>
        <AdminFormInput
          v-model="form.url"
          placeholder="请输入链接地址"
        />
      </AdminFormField>

      <AdminFormField label="头像" hint="图片URL，可选">
        <AdminFormInput
          v-model="form.avatar"
          placeholder="请输入头像图片URL"
        />
      </AdminFormField>

      <AdminFormField label="简介" hint="不超过128字，可选">
        <AdminFormInput
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入简介"
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
import { useMessageBox } from '@/composables/useMessageBox'
import { useAdminList } from '@/composables/useAdminList'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import { getAdminFriendLinks, createFriendLink, updateFriendLink, deleteFriendLink } from '@/api/friendLink'
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

const { toast } = useMessageBox()
const searchQuery = ref('')

const { items: allLinks, loading, refresh } = useAdminList(getAdminFriendLinks, {
  paginated: false,
  errorMessage: '获取友链列表失败'
})

const links = computed(() => {
  if (!searchQuery.value) return allLinks.value
  const q = searchQuery.value.toLowerCase()
  return allLinks.value.filter(l => l.name.toLowerCase().includes(q) || l.url.toLowerCase().includes(q))
})

const columns = [
  { key: 'name', label: '名称' },
  { key: 'url', label: '链接' },
  { key: 'sort_order', label: '排序', class: 'text-center' },
  { key: 'status', label: '状态', class: 'text-center' },
  { key: 'actions', label: '操作', class: 'text-center' }
]

const modalVisible = ref(false)
const editingLink = ref(null)
const form = ref({
  name: '',
  url: '',
  avatar: '',
  description: '',
  sort_order: 0,
  status: 'show'
})
const nameInputRef = ref(null)

const statusOptions = [
  { value: 'show', label: '显示' },
  { value: 'hide', label: '隐藏' }
]

function openModal(link = null) {
  editingLink.value = link
  if (link) {
    form.value = {
      name: link.name,
      url: link.url,
      avatar: link.avatar || '',
      description: link.description || '',
      sort_order: link.sort_order,
      status: link.status
    }
  } else {
    form.value = { name: '', url: '', avatar: '', description: '', sort_order: 0, status: 'show' }
  }
  modalVisible.value = true
  nextTick(() => {
    nameInputRef.value?.focus()
  })
}

function closeModal() {
  modalVisible.value = false
  editingLink.value = null
}

async function onSave() {
  const name = form.value.name.trim()
  const url = form.value.url.trim()

  if (!name) {
    toast('友链名称不能为空', 'error')
    return
  }
  if (!url) {
    toast('链接地址不能为空', 'error')
    return
  }

  try {
    const payload = {
      name,
      url,
      avatar: form.value.avatar.trim() || undefined,
      description: form.value.description.trim() || undefined,
      sort_order: form.value.sort_order,
      status: form.value.status
    }

    if (editingLink.value) {
      await updateFriendLink(editingLink.value.id, payload)
    } else {
      await createFriendLink(payload)
    }

    toast(editingLink.value ? '保存成功' : '创建成功')
    closeModal()
    refresh()
  } catch (e) {
    toast(e.message || '保存失败', 'error')
  }
}

const { confirmDelete: onDelete } = useConfirmDelete(deleteFriendLink, {
  message: '确定要删除这个友链吗？',
  successMessage: '删除成功',
  onSuccess: refresh
})
</script>

<style scoped>
.friend-link-list-page {
  width: 100%;
}
</style>
