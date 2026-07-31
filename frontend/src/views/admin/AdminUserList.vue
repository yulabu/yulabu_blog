<template>
  <div class="user-list-page">
    <AdminPageCard
      title="用户与权限"
      :loading="loading"
      :empty="!loading && admins.length === 0"
    >
      <template #actions>
        <AdminButton variant="primary" @click="openCreate">新建管理员</AdminButton>
      </template>

      <AdminDataTable :columns="columns" :data="admins">
        <template #cell-avatar="{ row }">
          <img :src="avatarUrl(row.avatar)" alt="avatar" class="avatar" />
        </template>

        <template #cell-name="{ row }">
          <span class="td-name">
            {{ row.name }}
            <span v-if="row.id === currentAdmin.id" class="self-badge">当前</span>
          </span>
        </template>

        <template #cell-created_at="{ row }">
          <span class="text-muted">{{ formatDate(row.created_at) }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="actions">
            <AdminButton variant="text" @click="openEdit(row)">编辑</AdminButton>
            <AdminButton variant="danger" @click="onDelete(row)">删除</AdminButton>
          </div>
        </template>
      </AdminDataTable>

      <Pagination v-if="!loading && totalPages > 1" v-model:page="page" :totalPages="totalPages" />
    </AdminPageCard>

    <!-- 新增/编辑弹窗 -->
    <AdminModal
      v-model:visible="formVisible"
      :title="isEditing ? '编辑管理员' : '新建管理员'"
      confirm-text="保存"
      :confirm-loading="saving"
      @confirm="submitForm"
    >
      <div class="form-group">
        <label>用户名</label>
        <input v-model.trim="form.name" type="text" placeholder="至少 6 位" />
      </div>

      <div v-if="!isEditing" class="form-group">
        <label>密码</label>
        <input v-model="form.password" type="password" placeholder="至少 8 位" />
      </div>

      <div class="form-group">
        <label>头像 URL（可选）</label>
        <input v-model.trim="form.avatar" type="text" placeholder="留空使用默认头像" />
      </div>

      <div v-if="isEditing && form.id === currentAdmin.id" class="form-group">
        <AdminButton variant="text" @click="openPasswordChange">
          修改密码
        </AdminButton>
      </div>
    </AdminModal>

    <!-- 修改密码弹窗 -->
    <AdminModal
      v-model:visible="passwordVisible"
      title="修改密码"
      confirm-text="保存"
      :confirm-loading="passwordSaving"
      @confirm="submitPassword"
    >
      <div class="form-group">
        <label>旧密码</label>
        <input v-model="passwordForm.oldPassword" type="password" />
      </div>

      <div class="form-group">
        <label>新密码</label>
        <input v-model="passwordForm.newPassword" type="password" placeholder="至少 8 位" />
      </div>

      <div class="form-group">
        <label>确认新密码</label>
        <input v-model="passwordForm.confirmPassword" type="password" />
      </div>
    </AdminModal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMessageBox } from '@/composables/useMessageBox'
import { useAdminList } from '@/composables/useAdminList'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import { useAuthStore } from '@/stores/auth'
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from '@/api/admin'
import { formatDate } from '@/utils/date'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminModal from '@/components/admin/AdminModal.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import Pagination from '@/components/common/Pagination.vue'

const { toast } = useMessageBox()
const authStore = useAuthStore()

const { items: admins, loading, page, totalPages, refresh } = useAdminList(getAdmins, {
  errorMessage: '获取管理员列表失败',
  extractList: data => data.admins || [],
  extractTotalPages: data => data.totalPages || 1
})

const currentAdmin = computed(() => authStore.admin || {})

const columns = [
  { key: 'avatar', label: '头像', class: 'text-center' },
  { key: 'name', label: '用户名' },
  { key: 'created_at', label: '创建时间' },
  { key: 'actions', label: '操作', class: 'text-center' }
]

function avatarUrl(src) {
  return src || new URL('@/assets/img/Personal_img.jpg', import.meta.url).href
}

const formVisible = ref(false)
const isEditing = ref(false)
const form = ref({ id: null, name: '', password: '', avatar: '' })
const saving = ref(false)

function openCreate() {
  isEditing.value = false
  form.value = { id: null, name: '', password: '', avatar: '' }
  formVisible.value = true
}

function openEdit(admin) {
  isEditing.value = true
  form.value = { id: admin.id, name: admin.name, password: '', avatar: admin.avatar || '' }
  formVisible.value = true
}

function closeForm() {
  formVisible.value = false
}

function validateForm() {
  if (!form.value.name || form.value.name.length < 6) {
    toast('用户名至少需要 6 位', 'error')
    return false
  }
  if (!isEditing.value && (!form.value.password || form.value.password.length < 8)) {
    toast('密码至少需要 8 位', 'error')
    return false
  }
  return true
}

async function submitForm() {
  if (!validateForm()) return

  saving.value = true
  try {
    const payload = {
      name: form.value.name,
      avatar: form.value.avatar || null,
      password: form.value.password || null
    }

    if (isEditing.value) {
      const updated = await updateAdmin(form.value.id, payload)
      if (form.value.id === currentAdmin.value.id) {
        authStore.updateProfile(updated)
      }
    } else {
      await createAdmin(payload)
    }

    toast(isEditing.value ? '修改成功' : '创建成功')
    closeForm()
    refresh()
  } catch (e) {
    toast(e.message, 'error')
  } finally {
    saving.value = false
  }
}

const { confirmDelete: onDelete } = useConfirmDelete(
  async (admin) => {
    if (admin.id === currentAdmin.value.id) {
      throw new Error('不能删除自己')
    }
    await deleteAdmin(admin.id)
  },
  {
    message: admin => `确定要删除管理员「${admin.name}」吗？`,
    successMessage: '删除成功',
    onSuccess: refresh
  }
)

const passwordVisible = ref(false)
const passwordForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const passwordSaving = ref(false)

function openPasswordChange() {
  passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  passwordVisible.value = true
}

function closePassword() {
  passwordVisible.value = false
}

function validatePassword() {
  if (!passwordForm.value.oldPassword) {
    toast('请输入旧密码', 'error')
    return false
  }
  if (!passwordForm.value.newPassword || passwordForm.value.newPassword.length < 8) {
    toast('新密码至少需要 8 位', 'error')
    return false
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    toast('两次输入的新密码不一致', 'error')
    return false
  }
  return true
}

async function submitPassword() {
  if (!validatePassword()) return

  passwordSaving.value = true
  try {
    await updateAdmin(currentAdmin.value.id, {
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    })
    toast('密码修改成功')
    closePassword()
  } catch (e) {
    toast(e.message, 'error')
  } finally {
    passwordSaving.value = false
  }
}
</script>

<style scoped>
.user-list-page {
  width: 100%;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(99, 149, 86, 0.2);
}

.td-name {
  font-weight: 500;
  color: rgb(45, 90, 65);
  display: flex;
  align-items: center;
  gap: 8px;
}

.self-badge {
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(99, 149, 86, 0.15);
  color: rgb(45, 90, 65);
  font-size: 12px;
  font-weight: normal;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.text-muted {
  color: rgb(120, 140, 125);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: rgb(65, 110, 105);
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(80, 140, 134, 0.3);
  background: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  color: rgb(45, 90, 65);
  outline: none;
  box-sizing: border-box;
}

.form-group input:focus {
  border-color: rgb(99, 149, 86);
}
</style>
