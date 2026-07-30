<template>
  <div class="tag-list-page">
    <AdminPageCard
      title="标签管理"
      :loading="loading"
      :empty="!loading && tags.length === 0"
    >
      <template #actions>
        <button class="btn-primary" @click="openModal()">新建标签</button>
      </template>

      <AdminDataTable :columns="columns" :data="tags">
        <template #cell-name="{ row }">
          <span class="td-name">{{ row.name }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="actions">
            <button class="btn-text" @click="openModal(row)">编辑</button>
            <button class="btn-text danger" @click="onDelete(row.id)">删除</button>
          </div>
        </template>
      </AdminDataTable>
    </AdminPageCard>

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
import { getTags, createTag, updateTag, deleteTag } from '@/api/tag'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'

const { confirm, toast } = useMessageBox()

const tags = ref([])
const loading = ref(false)
const modalVisible = ref(false)
const editingTag = ref(null)
const form = ref({ name: '' })
const inputRef = ref(null)

const columns = [
  { key: 'name', label: '标签名' },
  { key: 'count', label: '文章数量', class: 'text-center' },
  { key: 'actions', label: '操作', class: 'text-center' }
]

async function fetchTags() {
  loading.value = true
  try {
    tags.value = await getTags()
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
    if (editingTag.value) {
      await updateTag(editingTag.value.id, name)
    } else {
      await createTag(name)
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
    await deleteTag(id)
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

.td-name {
  font-weight: 500;
  color: rgb(45, 90, 65);
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
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
