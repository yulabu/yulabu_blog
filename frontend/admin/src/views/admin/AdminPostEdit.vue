<template>
  <div class="post-edit-page">
    <AdminPageCard :title="isEdit ? '编辑文章' : '新建文章'">
      <template #title-extra>
        <AdminStatusBadge :type="currentStatus" />
      </template>
      <template #actions>
        <AdminButton variant="secondary" @click="goBack">返回</AdminButton>
        <AdminButton variant="secondary" @click="openImportModal">导入附图片Markdown文章</AdminButton>
        <AdminButton variant="secondary" :loading="loading" @click="onSaveDraft">保存草稿</AdminButton>
        <AdminButton variant="primary" :loading="loading" @click="onPublish">发布</AdminButton>
      </template>

      <AdminForm>
        <AdminFormField label="标题">
          <AdminFormInput v-model="form.title" placeholder="请输入标题" />
        </AdminFormField>

        <AdminFormField label="封面">
          <AdminImageUpload
            v-model="form.cover"
            :upload="uploadCoverImage"
            tip="建议尺寸 16/9，jpg/png 格式"
          />
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
                  <button type="button" class="btn-add" @click="openTagModal" title="新建分类">+</button>
                </template>
              </AdminFormSelect>
            </AdminFormField>
          </AdminFormGroup>
          <AdminFormGroup>
            <AdminFormField label="作者">
              <AdminFormInput v-model="form.author" placeholder="作者" />
            </AdminFormField>
          </AdminFormGroup>
          <AdminFormGroup>
            <AdminFormField label="所属专栏" hint="切换后立即生效">
              <AdminFormSelect
                v-model="form.columnId"
                placeholder="无专栏"
                :options="columnOptions"
                :disabled="columnSaving"
              />
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
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useMessageBox } from '@/composables/useMessageBox'
import { getTags, createTag } from '@/api/tag'
import { getAdminPost, createPost, updatePost, unbindImages } from '@/api/post'
import { getAdminColumns, addColumnPost, removeColumnPost } from '@/api/column'
import { uploadImages } from '@/api/image'
import {
  extractLocalImageRefs,
  matchImagesByFilename,
  buildMarkdownWithImageUrls
} from '@/utils/importMarkdown'
import AdminModal from '@/components/admin/AdminModal.vue'
import AdminImageUpload from '@/components/admin/AdminImageUpload.vue'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge.vue'
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
const { toast, confirm } = useMessageBox()

const isEdit = computed(() => !!route.params.id)

const form = ref({
  title: '',
  summary: '',
  categoryId: '',
  author: '匿名',
  content: '',
  columnId: '',
  cover: ''
})

const tags = ref([])
const loading = ref(false)
const tagModalVisible = ref(false)
const newTagName = ref('')
const tagInputRef = ref(null)
const tagSaving = ref(false)
const importModalVisible = ref(false)
const importModalRef = ref(null)

// ===== 图片绑定：ensureDraft 延迟建草稿 + 双快照脏检查 =====
const draftId = ref(null)
let draftPromise = null

// 快照：上次保存/加载后的表单状态，用于脏检查
const originalData = ref(null)

function snapshotForm() {
  return {
    title: form.value.title,
    summary: form.value.summary,
    categoryId: form.value.categoryId,
    author: form.value.author,
    content: form.value.content,
    columnId: form.value.columnId,
    cover: form.value.cover
  }
}

function isDeepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

const hasUnsavedChanges = computed(() => {
  if (!originalData.value) return false
  return !isDeepEqual(originalData.value, snapshotForm())
})

// 确保草稿已创建并返回 post_id（Promise 去重，防止输入/上传并发重复建草稿）
async function ensureDraft() {
  if (isEdit.value) return Number(route.params.id)
  if (draftId.value) return draftId.value
  if (draftPromise) return draftPromise

  draftPromise = (async () => {
    try {
      const res = await createPost({
        title: form.value.title || '未命名草稿',
        content: form.value.content,
        summary: form.value.summary,
        author: form.value.author || '匿名',
        categoryId: form.value.categoryId ? Number(form.value.categoryId) : null,
        cover: form.value.cover?.trim() || null
      })
      draftId.value = res.id
      return res.id
    } finally {
      draftPromise = null
    }
  })()

  return draftPromise
}

// 首次输入触发建草稿（进入页面但什么都不做则不建，避免脏数据）
watch(
  () => [form.value.title, form.value.content, form.value.summary],
  () => {
    if (!isEdit.value && !draftId.value && !draftPromise) {
      ensureDraft().catch(() => {})
    }
  }
)

const tagOptions = computed(() =>
  tags.value.map((tag) => ({ value: tag.id, label: tag.name }))
)

const columns = ref([])
const columnSaving = ref(false)
const columnInitialized = ref(false)
const currentStatus = ref('draft')

const columnOptions = computed(() =>
  columns.value.map((c) => ({ value: c.id, label: c.name }))
)

async function fetchColumns() {
  try {
    columns.value = await getAdminColumns()
  } catch (e) {
    toast('获取专栏列表失败', 'error')
  }
}

watch(() => form.value.columnId, async (val) => {
  if (!columnInitialized.value || !isEdit.value) return
  const postId = Number(route.params.id)
  if (columnSaving.value) return

  columnSaving.value = true
  try {
    if (val) {
      await addColumnPost(Number(val), postId)
      toast('已加入专栏')
    } else {
      await removeColumnPost(form.value.lastColumnId, postId)
      toast('已移出专栏')
    }
  } catch (e) {
    toast(e.message || '专栏更新失败', 'error')
    form.value.columnId = form.value.lastColumnId
  } finally {
    columnSaving.value = false
    form.value.lastColumnId = form.value.columnId
  }
})

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
  const postId = await ensureDraft()
  return uploadImages({ files, postId })
}

// 封面上传：绑定类型 cover，返回 URL（v-model 由 AdminImageUpload 写入 form.cover）
async function uploadCoverImage(file) {
  const postId = await ensureDraft()
  const result = await uploadImages({ files: [file], postId, type: 'cover' })
  return result.images[0].url
}

async function uploadImagesForEditor(files) {
  const result = await handleUploadImages(Array.from(files))
  return result.images.map((img) => img.url)
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

    const result = await handleUploadImages(uniqueFiles)
    const fileToUrl = new Map()
    result.images.forEach((img, i) => fileToUrl.set(uniqueFiles[i], img.url))

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
    const post = await getAdminPost(Number(route.params.id))
    form.value = {
      title: post.title || '',
      summary: post.summary || '',
      categoryId: post.category?.id || '',
      author: post.author || '匿名',
      content: post.content || '',
      columnId: post.column?.id || '',
      lastColumnId: post.column?.id || '',
      cover: post.cover || ''
    }
    columnInitialized.value = true
    currentStatus.value = post.status || 'draft'
    originalData.value = snapshotForm()
  } catch (e) {
    toast('获取文章失败', 'error')
  }
}

// 保存草稿：无强制校验（标题/正文可为空），保持当前状态
// 新建/编辑草稿 → draft；编辑已发布文章 → published（保存修改不降级）
async function onSaveDraft() {
  if (loading.value) return

  loading.value = true
  try {
    const postForm = {
      title: form.value.title.trim() || '未命名草稿',
      content: form.value.content,
      summary: form.value.summary.trim(),
      author: form.value.author.trim(),
      categoryId: form.value.categoryId ? Number(form.value.categoryId) : null,
      cover: form.value.cover?.trim() || null
    }

    let postId
    let status
    if (isEdit.value) {
      postId = Number(route.params.id)
      status = currentStatus.value || 'draft' // 保持当前状态：已发布不降级
    } else {
      postId = await ensureDraft()
      status = 'draft'
    }
    await updatePost(postId, postForm, status)
    toast('草稿已保存')
    originalData.value = snapshotForm()
    router.push('/admin/posts')
  } catch (e) {
    toast(e.message || '保存失败', 'error')
  } finally {
    loading.value = false
  }
}

// 发布：校验标题/正文，将现有 post 状态更新为 published
async function onPublish() {
  if (loading.value) return

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
      categoryId: form.value.categoryId ? Number(form.value.categoryId) : null,
      cover: form.value.cover?.trim() || null
    }

    if (isEdit.value) {
      await updatePost(Number(route.params.id), postForm, 'published')
    } else {
      // 新建：草稿已由 ensureDraft 创建，发布即状态流转
      const postId = await ensureDraft()
      await updatePost(postId, postForm, 'published')
    }
    toast('发布成功')
    originalData.value = snapshotForm()
    router.push('/admin/posts')
  } catch (e) {
    toast(e.message || '发布失败', 'error')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/admin')
}

onBeforeRouteLeave(async () => {
  // 1. 未保存修改：确认是否离开
  if (hasUnsavedChanges.value) {
    const ok = await confirm('提示', '当前内容尚未保存，确定要离开吗？未保存的内容将会丢失。')
    if (!ok) return false
  }

  // 2. 离开前差集解绑：正文不再引用的图片置为孤儿（后端幂等）
  const postId = isEdit.value ? Number(route.params.id) : draftId.value
  if (postId) {
    try {
      await unbindImages(postId)
    } catch { /* 静默忽略 */ }
  }
  return true
})

onMounted(() => {
  fetchTags()
  fetchColumns()
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
