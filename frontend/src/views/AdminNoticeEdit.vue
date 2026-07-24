<template>
  <div class="notice-edit-page">
    <div class="card">
      <div class="card-header">
        <h2 class="title">{{ isEdit ? '编辑公告' : '新建公告' }}</h2>
        <div class="actions">
          <button class="btn-secondary" @click="goBack">返回</button>
          <button class="btn-primary" @click="onSave">保存</button>
        </div>
      </div>

      <div class="form">
        <div class="form-row">
          <label class="form-label">标题</label>
          <input v-model="form.notice_title" class="form-input" type="text" placeholder="请输入公告标题" />
        </div>

        <div class="form-row inline">
          <div class="form-group">
            <label class="form-label">状态</label>
            <select v-model="form.notice_status" class="form-select">
              <option value="show">显示</option>
              <option value="hide">隐藏</option>
            </select>
          </div>
          <div class="form-group checkbox-group">
            <label class="form-label">置顶</label>
            <label class="checkbox-wrap">
              <input v-model="form.notice_is_pinned" type="checkbox" />
              <span>置顶公告</span>
            </label>
          </div>
        </div>

        <div class="form-row editor-row">
          <label class="form-label">内容</label>
          <MdEditor
            v-model="form.notice_content"
            theme="light"
            previewTheme="github"
            codeTheme="github"
            :showCodeRowNumber="true"
            :toolbars="toolbars"
            class="md-editor"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { useMessageBox } from '@/composables/useMessageBox'
import { authFetch } from '@/utils/request'

const route = useRoute()
const router = useRouter()
const { toast } = useMessageBox()

const isEdit = computed(() => !!route.params.id)

const form = ref({
  notice_title: '',
  notice_content: '',
  notice_status: 'show',
  notice_is_pinned: false
})

const loading = ref(false)

const toolbars = [
  'bold',
  'underline',
  'italic',
  '-',
  'title',
  'strikeThrough',
  'quote',
  'unorderedList',
  'orderedList',
  'task',
  '-',
  'codeRow',
  'code',
  'link',
  'image',
  'table',
  'mermaid',
  'katex',
  '-',
  'revoke',
  'next',
  'preview',
  'previewOnly',
  'catalog',
  'github'
]

async function fetchNotice() {
  if (!isEdit.value) return
  try {
    const res = await authFetch(`/api/admin/notices/${route.params.id}`)
    if (!res.ok) throw new Error('获取公告失败')
    const notice = await res.json()
    form.value = {
      notice_title: notice.notice_title || '',
      notice_content: notice.notice_content || '',
      notice_status: notice.notice_status || 'show',
      notice_is_pinned: !!notice.notice_is_pinned
    }
  } catch (e) {
    console.error(e)
    toast('获取公告失败', 'error')
  }
}

async function onSave() {
  const title = form.value.notice_title.trim()
  const content = form.value.notice_content.trim()

  if (!title) {
    toast('标题不能为空', 'error')
    return
  }
  if (!content) {
    toast('内容不能为空', 'error')
    return
  }

  loading.value = true
  try {
    const payload = {
      notice_title: title,
      notice_content: content,
      notice_status: form.value.notice_status,
      notice_is_pinned: form.value.notice_is_pinned
    }

    const url = isEdit.value ? `/api/admin/notices/${route.params.id}` : '/api/admin/notices'
    const method = isEdit.value ? 'PUT' : 'POST'

    const res = await authFetch(url, {
      method,
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || '保存失败')
    }

    toast(isEdit.value ? '保存成功' : '创建成功')
    router.push('/admin/notices')
  } catch (e) {
    console.error(e)
    toast(e.message || '保存失败', 'error')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/admin/notices')
}

onMounted(fetchNotice)
</script>

<style scoped>
.notice-edit-page {
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

.actions {
  display: flex;
  gap: 10px;
}

.btn-primary,
.btn-secondary {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;
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

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row.inline {
  flex-direction: row;
  gap: 16px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  color: rgb(65, 110, 105);
  font-weight: 500;
}

.form-input,
.form-select {
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

.form-input:focus,
.form-select:focus {
  border-color: rgb(99, 149, 86);
}

.checkbox-group {
  justify-content: flex-start;
}

.checkbox-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 0;
  color: rgb(45, 90, 65);
  font-size: 14px;
  cursor: pointer;
}

.checkbox-wrap input {
  width: 16px;
  height: 16px;
  accent-color: rgb(99, 149, 86);
  cursor: pointer;
}

.editor-row {
  min-height: 400px;
}

.md-editor {
  border-radius: 8px;
  overflow: hidden;
}
</style>
