<template>
  <div class="tag-list-page">
    <div class="card">
      <div class="card-header">
        <h2 class="title">标签管理</h2>
        <button class="btn-primary" @click="openModal()">新建标签</button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>

      <table v-else class="tag-table">
        <thead>
          <tr>
            <th>标签名</th>
            <th>文章数量</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tag in tags" :key="tag.id">
            <td class="td-name">{{ tag.name }}</td>
            <td>{{ tag.count }}</td>
            <td>
              <div class="actions">
                <button class="btn-text" @click="openModal(tag)">编辑</button>
                <button class="btn-text danger" @click="onDelete(tag.id)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 弹窗 -->
    <div v-if="modalVisible" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <h3 class="modal-title">{{ editingTag ? '编辑标签' : '新建标签' }}</h3>
        <div class="form-row">
          <label class="form-label">标签名</label>
          <input
            ref="inputRef"
            v-model="form.name"
            class="form-input"
            type="text"
            placeholder="请输入标签名"
            @keyup.enter="onSave"
          />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="onSave">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useMessageBox } from '@/composables/useMessageBox'
import { authFetch } from '@/utils/request'

const { confirm, toast } = useMessageBox()

const tags = ref([])
const loading = ref(false)
const modalVisible = ref(false)
const editingTag = ref(null)
const form = ref({ name: '' })
const inputRef = ref(null)

async function fetchTags() {
  loading.value = true
  try {
    const res = await authFetch('/api/tags/')
    if (!res.ok) throw new Error('获取标签失败')
    tags.value = await res.json()
  } catch (e) {
    console.error(e)
    toast('获取标签失败', 'error')
  } finally {
    loading.value = false
  }
}

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
    const url = editingTag.value ? `/api/tags/${editingTag.value.id}` : '/api/tags/'
    const method = editingTag.value ? 'PUT' : 'POST'

    const res = await authFetch(url, {
      method,
      body: JSON.stringify({ tag_name: name })
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || '保存失败')
    }

    toast(editingTag.value ? '保存成功' : '创建成功')
    closeModal()
    fetchTags()
  } catch (e) {
    console.error(e)
    toast(e.message || '保存失败', 'error')
  }
}

async function onDelete(id) {
  const ok = await confirm('删除确认', '确定要删除这个标签吗？')
  if (!ok) return

  try {
    const res = await authFetch(`/api/tags/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || '删除失败')
    }
    toast('删除成功')
    fetchTags()
  } catch (e) {
    console.error(e)
    toast(e.message || '删除失败', 'error')
  }
}

onMounted(() => {
  fetchTags()
})
</script>

<style scoped>
.tag-list-page {
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

.tag-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.tag-table th,
.tag-table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px dashed rgba(80, 140, 134, 0.2);
}

.tag-table th {
  color: rgb(45, 90, 65);
  font-weight: 600;
  background: rgba(99, 149, 86, 0.08);
}

.tag-table tbody tr:hover {
  background: rgba(99, 149, 86, 0.04);
}

.td-name {
  font-weight: 500;
  color: rgb(45, 90, 65);
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

.modal-overlay {
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

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}

.form-label {
  font-size: 13px;
  color: rgb(65, 110, 105);
  font-weight: 500;
}

.form-input {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(80, 140, 134, 0.25);
  background: rgba(255, 255, 255, 0.5);
  color: rgb(45, 90, 65);
  font-size: 14px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  outline: none;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  border-color: rgb(99, 149, 86);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.btn-primary {
  background: rgb(99, 149, 86);
  color: white;
}

.btn-primary:hover {
  background: rgb(79, 129, 66);
}

.btn-secondary {
  background: rgba(80, 140, 134, 0.12);
  color: rgb(65, 110, 105);
}

.btn-secondary:hover {
  background: rgba(80, 140, 134, 0.22);
}
</style>
