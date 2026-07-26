<template>
  <div class="user-list-page">
    <div class="card">
      <div class="card-header">
        <h2 class="title">用户与权限</h2>
        <button class="btn-primary" @click="openCreate">新建管理员</button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>

      <table v-else class="user-table">
        <thead>
          <tr>
            <th>头像</th>
            <th>用户名</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="admin in admins" :key="admin.id">
            <td>
              <img :src="avatarUrl(admin.avatar)" alt="avatar" class="avatar" />
            </td>
            <td class="td-name">
              {{ admin.name }}
              <span v-if="admin.id === currentAdmin.id" class="self-badge">当前</span>
            </td>
            <td class="text-muted">{{ formatDate(admin.created_at) }}</td>
            <td>
              <div class="actions">
                <button class="btn-text" @click="openEdit(admin)">编辑</button>
                <button class="btn-text danger" @click="onDelete(admin)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <Pagination v-if="!loading && totalPages > 1" v-model:page="page" :totalPages="totalPages" />
    </div>

    <!-- 新增/编辑弹窗 -->
    <div v-if="formVisible" class="overlay" @click="closeForm">
      <div class="modal" @click.stop>
        <h3 class="modal-title">{{ isEditing ? '编辑管理员' : '新建管理员' }}</h3>

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
          <button class="btn-text" @click="openPasswordChange">
            修改密码
          </button>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="closeForm">取消</button>
          <button class="btn-confirm" @click="submitForm">保存</button>
        </div>
      </div>
    </div>

    <!-- 修改密码弹窗 -->
    <div v-if="passwordVisible" class="overlay" @click="closePassword">
      <div class="modal" @click.stop>
        <h3 class="modal-title">修改密码</h3>

        <div class="form-group">
          <label>旧密码</label>
          <input v-model="passwordForm.old_password" type="password" />
        </div>

        <div class="form-group">
          <label>新密码</label>
          <input v-model="passwordForm.new_password" type="password" placeholder="至少 8 位" />
        </div>

        <div class="form-group">
          <label>确认新密码</label>
          <input v-model="passwordForm.confirm_password" type="password" />
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="closePassword">取消</button>
          <button class="btn-confirm" @click="submitPassword">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useMessageBox } from '@/composables/useMessageBox'
import { authFetch } from '@/utils/request'
import { formatDate } from '@/utils/date'
import Pagination from '@/components/Pagination.vue'

const { confirm, toast } = useMessageBox()

const admins = ref([])
const page = ref(1)
const totalPages = ref(1)
const loading = ref(false)

const currentAdmin = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('admin') || '{}')
  } catch {
    return {}
  }
})

function avatarUrl(src) {
  return src || new URL('@/assets/img/Personal_img.jpg', import.meta.url).href
}

async function fetchAdmins() {
  loading.value = true
  try {
    const res = await authFetch(`/api/admin/admins?page=${page.value}&limit=10`)
    if (!res.ok) throw new Error('获取管理员列表失败')
    const data = await res.json()
    admins.value = data.admins || []
    totalPages.value = data.totalPages || 1
  } catch (e) {
    console.error(e)
    toast('获取管理员列表失败', 'error')
  } finally {
    loading.value = false
  }
}

watch(page, fetchAdmins, { immediate: true })

const formVisible = ref(false)
const isEditing = ref(false)
const form = ref({ id: null, name: '', password: '', avatar: '' })

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

  try {
    const payload = {
      admin_name: form.value.name,
      admin_avatar: form.value.avatar || null
    }
    if (!isEditing.value) {
      payload.admin_password = form.value.password
    }

    const res = isEditing.value
      ? await authFetch(`/api/admin/admins/${form.value.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
      : await authFetch('/api/admin/admins', {
          method: 'POST',
          body: JSON.stringify(payload)
        })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || '保存失败')
    }

    toast(isEditing.value ? '修改成功' : '创建成功')
    closeForm()
    fetchAdmins()
  } catch (e) {
    toast(e.message, 'error')
  }
}

async function onDelete(admin) {
  if (admin.id === currentAdmin.value.id) {
    toast('不能删除自己', 'error')
    return
  }

  const ok = await confirm('删除确认', `确定要删除管理员「${admin.name}」吗？`)
  if (!ok) return

  try {
    const res = await authFetch(`/api/admin/admins/${admin.id}`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || '删除失败')
    }
    toast('删除成功')
    fetchAdmins()
  } catch (e) {
    toast(e.message, 'error')
  }
}

const passwordVisible = ref(false)
const passwordForm = ref({ old_password: '', new_password: '', confirm_password: '' })

function openPasswordChange() {
  passwordForm.value = { old_password: '', new_password: '', confirm_password: '' }
  passwordVisible.value = true
}

function closePassword() {
  passwordVisible.value = false
}

function validatePassword() {
  if (!passwordForm.value.old_password) {
    toast('请输入旧密码', 'error')
    return false
  }
  if (!passwordForm.value.new_password || passwordForm.value.new_password.length < 8) {
    toast('新密码至少需要 8 位', 'error')
    return false
  }
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    toast('两次输入的新密码不一致', 'error')
    return false
  }
  return true
}

async function submitPassword() {
  if (!validatePassword()) return

  try {
    const res = await authFetch(`/api/admin/admins/${currentAdmin.value.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        old_password: passwordForm.value.old_password,
        new_password: passwordForm.value.new_password
      })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || '修改失败')
    }
    toast('密码修改成功')
    closePassword()
  } catch (e) {
    toast(e.message, 'error')
  }
}
</script>

<style scoped>
.user-list-page {
  width: 100%;
}

.card {
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-top: 1px solid white;
  border-left: 1px solid white;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, .6),
      rgba(255, 255, 255, .3),
      rgba(255, 255, 255, .2));
  backdrop-filter: blur(16px);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: rgb(45, 90, 65);
  margin: 0;
}

.btn-primary {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: rgb(99, 149, 86);
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.btn-primary:hover {
  background: rgb(79, 129, 66);
}

.loading {
  padding: 40px 0;
  text-align: center;
  color: rgb(65, 110, 105);
}

.user-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.user-table th,
.user-table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px dashed rgba(80, 140, 134, 0.2);
}

.user-table th {
  color: rgb(45, 90, 65);
  font-weight: 600;
  background: rgba(99, 149, 86, 0.08);
}

.user-table tbody tr:hover {
  background: rgba(99, 149, 86, 0.04);
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
}

.btn-text {
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: rgb(99, 149, 86);
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.btn-text:hover {
  background: rgba(99, 149, 86, 0.1);
}

.btn-text.danger {
  color: rgb(200, 80, 80);
}

.btn-text.danger:hover {
  background: rgba(200, 80, 80, 0.1);
}

.text-muted {
  color: rgb(120, 140, 125);
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal {
  min-width: 360px;
  max-width: 480px;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border-top: 1px solid white;
  border-left: 1px solid white;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, .85),
      rgba(255, 255, 255, .65));
  backdrop-filter: blur(16px);
}

.modal-title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: rgb(45, 90, 65);
  margin: 0 0 20px;
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.modal-actions button {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.btn-confirm {
  background: rgb(99, 149, 86);
  color: white;
}

.btn-confirm:hover {
  background: rgb(79, 129, 66);
}

.btn-cancel {
  background: rgba(80, 140, 134, 0.12);
  color: rgb(65, 110, 65);
}

.btn-cancel:hover {
  background: rgba(80, 140, 134, 0.22);
}
</style>
