<template>
  <div class="post-edit-page">
    <div class="card">
      <div class="card-header">
        <h2 class="title">{{ isEdit ? '编辑文章' : '新建文章' }}</h2>
        <div class="actions">
          <button class="btn-secondary" @click="goBack">返回</button>
          <button class="btn-primary" @click="onSave">保存</button>
        </div>
      </div>

      <div class="form">
        <div class="form-row">
          <label class="form-label">标题</label>
          <input v-model="form.title" class="form-input" type="text" placeholder="请输入标题" />
        </div>

        <div class="form-row">
          <label class="form-label">摘要</label>
          <input v-model="form.summary" class="form-input" type="text" placeholder="请输入摘要" />
        </div>

        <div class="form-row inline">
          <div class="form-group category-group">
            <label class="form-label">分类</label>
            <div class="category-select-row">
              <select v-model="form.categoryId" class="form-select">
                <option value="">无分类</option>
                <option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
              </select>
              <button class="btn-add" @click="openTagModal" title="新建分类">+</button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">作者</label>
            <input v-model="form.author" class="form-input" type="text" placeholder="作者" />
          </div>
        </div>

        <div class="form-row editor-row">
          <label class="form-label">正文</label>
          <MdEditor
            v-model="form.content"
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

    <!-- 新建分类弹窗 -->
    <div v-if="tagModalVisible" class="modal-overlay" @click="closeTagModal">
      <div class="modal" @click.stop>
        <h3 class="modal-title">新建分类</h3>
        <div class="form-row">
          <label class="form-label">分类名</label>
          <input
            ref="tagInputRef"
            v-model="newTagName"
            class="form-input"
            type="text"
            placeholder="请输入分类名"
            @keyup.enter="onCreateTag"
          />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeTagModal">取消</button>
          <button class="btn btn-primary" @click="onCreateTag">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
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
  title: '',
  summary: '',
  categoryId: '',
  author: '匿名',
  content: ''
})

const tags = ref([])
const loading = ref(false)
const tagModalVisible = ref(false)
const newTagName = ref('')
const tagInputRef = ref(null)

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

async function fetchTags() {
  try {
    const res = await fetch('/api/tags/')
    if (!res.ok) throw new Error('获取标签失败')
    tags.value = await res.json()
  } catch (e) {
    console.error(e)
  }
}

function openTagModal() {
  tagModalVisible.value = true
  newTagName.value = ''
  nextTick(() => {
    tagInputRef.value?.focus()
  })
}

function closeTagModal() {
  tagModalVisible.value = false
  newTagName.value = ''
}

async function onCreateTag() {
  const name = newTagName.value.trim()
  if (!name) {
    toast('分类名不能为空', 'error')
    return
  }

  const exists = tags.value.some(tag => tag.name.toLowerCase() === name.toLowerCase())
  if (exists) {
    toast('该分类已存在', 'error')
    return
  }

  try {
    const res = await authFetch('/api/tags/', {
      method: 'POST',
      body: JSON.stringify({ tag_name: name })
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || '创建失败')
    }

    const newTag = await res.json()
    toast('分类创建成功')
    closeTagModal()
    await fetchTags()
    form.value.categoryId = String(newTag.id)
  } catch (e) {
    console.error(e)
    toast(e.message || '创建失败', 'error')
  }
}

async function fetchPost() {
  if (!isEdit.value) return
  try {
    const res = await authFetch(`/api/posts/${route.params.id}`)
    if (!res.ok) throw new Error('获取文章失败')
    const post = await res.json()
    form.value = {
      title: post.title || '',
      summary: post.summary || '',
      categoryId: post.category?.id || '',
      author: post.author || '匿名',
      content: post.content || ''
    }
  } catch (e) {
    console.error(e)
    toast('获取文章失败', 'error')
  }
}

async function onSave() {
  if (!form.value.title.trim()) {
    toast('标题不能为空', 'error')
    return
  }
  if (!form.value.content.trim()) {
    toast('正文不能为空', 'error')
    return
  }

  loading.value = true
  try {
    const payload = {
      post_title: form.value.title.trim(),
      post_content: form.value.content,
      post_summary: form.value.summary.trim() || null,
      post_author: form.value.author.trim() || '匿名',
      post_category_id: form.value.categoryId ? Number(form.value.categoryId) : null
    }

    const url = isEdit.value ? `/api/posts/${route.params.id}` : '/api/posts'
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
    if (!isEdit.value) {
      router.push('/admin')
    }
  } catch (e) {
    console.error(e)
    toast(e.message || '保存失败', 'error')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/admin')
}

onMounted(() => {
  fetchTags()
  fetchPost()
})
</script>

<style scoped>
.post-edit-page {
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

.form-input::placeholder {
  color: rgba(65, 110, 105, 0.5);
}

.editor-row {
  min-height: 500px;
}

.md-editor {
  border-radius: 8px;
  overflow: hidden;
}

.category-select-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-select-row .form-select {
  flex: 1;
}

.btn-add {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: rgb(99, 149, 86);
  color: white;
  font-size: 20px;
  cursor: pointer;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-add:hover {
  background: rgb(79, 129, 66);
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-actions .btn {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.modal-actions .btn-primary {
  background: rgb(99, 149, 86);
  color: white;
}

.modal-actions .btn-primary:hover {
  background: rgb(79, 129, 66);
}

.modal-actions .btn-secondary {
  background: rgba(80, 140, 134, 0.12);
  color: rgb(65, 110, 105);
}

.modal-actions .btn-secondary:hover {
  background: rgba(80, 140, 134, 0.22);
}
</style>
