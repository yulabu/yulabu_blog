<template>
  <div class="post-edit-page">
    <AdminPageCard :title="isEdit ? '编辑文章' : '新建文章'">
      <template #actions>
        <AdminButton variant="secondary" @click="goBack">返回</AdminButton>
        <AdminButton variant="secondary" @click="openImportModal">导入附图片Markdown文章</AdminButton>
        <AdminButton variant="primary" @click="onSave">保存</AdminButton>
      </template>

      <AdminForm>
        <AdminFormField label="标题">
          <AdminFormInput v-model="form.title" placeholder="请输入标题" />
        </AdminFormField>

        <AdminFormField label="摘要">
          <AdminFormInput v-model="form.summary" placeholder="请输入摘要" />
        </AdminFormField>

        <AdminFormRow inline>
          <AdminFormGroup>
            <AdminFormField label="分类">
              <AdminFormSelect
                v-model="form.categoryId"
                placeholder="无分类"
                :options="tagOptions"
              >
                <template #append>
                  <button class="btn-add" @click="openTagModal" title="新建分类">+</button>
                </template>
              </AdminFormSelect>
            </AdminFormField>
          </AdminFormGroup>
          <AdminFormGroup>
            <AdminFormField label="作者">
              <AdminFormInput v-model="form.author" placeholder="作者" />
            </AdminFormField>
          </AdminFormGroup>
        </AdminFormRow>

        <AdminFormField label="正文">
          <AdminMarkdownField v-model="form.content" :upload-images="uploadImagesForEditor" />
        </AdminFormField>
      </AdminForm>
    </AdminPageCard>

    <!-- 新建分类弹窗 -->
    <AdminModal
      v-model:visible="tagModalVisible"
      title="新建分类"
      confirm-text="确定"
      :confirm-loading="tagSaving"
      @confirm="onCreateTag"
    >
      <AdminFormField label="分类名">
        <AdminFormInput
          ref="tagInputRef"
          v-model="newTagName"
          placeholder="请输入分类名"
          @keyup.enter="onCreateTag"
        />
      </AdminFormField>
    </AdminModal>

    <!-- 导入本地 Markdown 弹窗 -->
    <ImportMarkdownModal
      ref="importModalRef"
      :visible="importModalVisible"
      :loading="loading"
      @confirm="handleImport"
      @cancel="closeImportModal"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessageBox } from '@/composables/useMessageBox'
import { getTags, createTag } from '@/api/tag'
import { getPost, createPost, updatePost } from '@/api/post'
import { uploadImages } from '@/api/upload'
import {
  extractLocalImageRefs,
  matchImagesByFilename,
  buildMarkdownWithImageUrls
} from '@/utils/importMarkdown'
import AdminModal from '@/components/admin/AdminModal.vue'
import ImportMarkdownModal from '@/components/admin/ImportMarkdownModal.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminForm from '@/components/admin/forms/AdminForm.vue'
import AdminFormRow from '@/components/admin/forms/AdminFormRow.vue'
import AdminFormGroup from '@/components/admin/forms/AdminFormGroup.vue'
import AdminFormField from '@/components/admin/forms/AdminFormField.vue'
import AdminFormInput from '@/components/admin/forms/AdminFormInput.vue'
import AdminFormSelect from '@/components/admin/forms/AdminFormSelect.vue'
import AdminMarkdownField from '@/components/admin/forms/AdminMarkdownField.vue'

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
const tagSaving = ref(false)
const tempId = ref('')
const importModalVisible = ref(false)
const importModalRef = ref(null)

const tagOptions = computed(() =>
  tags.value.map((tag) => ({ value: tag.id, label: tag.name }))
)

async function fetchTags() {
  try {
    tags.value = await getTags()
  } catch (e) {
    toast('获取标签失败', 'error')
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

function openImportModal() {
  importModalVisible.value = true
}

function closeImportModal() {
  importModalVisible.value = false
  importModalRef.value?.reset()
}

function generateTempId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
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

  tagSaving.value = true
  try {
    const newTag = await createTag(name)
    toast('分类创建成功')
    closeTagModal()
    await fetchTags()
    form.value.categoryId = String(newTag.id)
  } catch (e) {
    toast(e.message || '创建失败', 'error')
  } finally {
    tagSaving.value = false
  }
}

async function handleUploadImages(files) {
  const urls = await uploadImages({
    files,
    postId: isEdit.value ? Number(route.params.id) : undefined,
    tempId: isEdit.value ? undefined : tempId.value
  })
  return urls
}

async function uploadImagesForEditor(files) {
  return await handleUploadImages(Array.from(files))
}

async function handleImport({ markdown, files }) {
  const refs = extractLocalImageRefs(markdown)
  if (refs.length === 0) {
    form.value.content = markdown
    closeImportModal()
    return
  }

  const { matched, unmatched, conflicted } = matchImagesByFilename(refs, files)
  if (matched.length === 0) {
    toast('没有匹配到任何图片', 'error')
    return
  }

  loading.value = true
  try {
    const uniqueFiles = []
    const seen = new Set()
    for (const m of matched) {
      if (!seen.has(m.file)) {
        seen.add(m.file)
        uniqueFiles.push(m.file)
      }
    }

    const urls = await handleUploadImages(uniqueFiles)
    const fileToUrl = new Map()
    uniqueFiles.forEach((file, i) => fileToUrl.set(file, urls[i]))

    const replacements = matched.map((m) => ({
      ref: m.ref,
      url: fileToUrl.get(m.file)
    }))

    form.value.content = buildMarkdownWithImageUrls(markdown, replacements)

    let msg = `导入完成：成功 ${matched.length} 张`
    if (unmatched.length) msg += `，未匹配 ${unmatched.length} 张`
    if (conflicted.length) msg += `，冲突跳过 ${conflicted.length} 张`
    toast(msg, unmatched.length || conflicted.length ? 'warning' : 'success')

    closeImportModal()
  } catch (e) {
    toast(e.message || '导入失败', 'error')
  } finally {
    loading.value = false
  }
}

async function fetchPost() {
  if (!isEdit.value) return
  try {
    const post = await getPost(Number(route.params.id))
    form.value = {
      title: post.title || '',
      summary: post.summary || '',
      categoryId: post.category?.id || '',
      author: post.author || '匿名',
      content: post.content || ''
    }
  } catch (e) {
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
    const postForm = {
      title: form.value.title.trim(),
      content: form.value.content,
      summary: form.value.summary.trim(),
      author: form.value.author.trim(),
      categoryId: form.value.categoryId ? Number(form.value.categoryId) : null
    }

    if (isEdit.value) {
      await updatePost(Number(route.params.id), postForm)
      toast('保存成功')
    } else {
      const data = await createPost(postForm, tempId.value)
      toast('创建成功')
      router.push(`/admin/posts/${data.id}/edit`)
    }
  } catch (e) {
    toast(e.message || '保存失败', 'error')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/admin')
}

onMounted(() => {
  if (!isEdit.value) {
    tempId.value = generateTempId()
  }
  fetchTags()
  fetchPost()
})
</script>

<style scoped>
.post-edit-page {
  width: 100%;
}

.btn-add {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: var(--color-primary);
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
  background: var(--color-primary-hover);
}
</style>
