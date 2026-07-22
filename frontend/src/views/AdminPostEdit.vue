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
          <div class="form-group">
            <label class="form-label">分类</label>
            <select v-model="form.categoryId" class="form-select">
              <option value="">无分类</option>
              <option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
            </select>
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
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
</style>
