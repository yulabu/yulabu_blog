<template>
  <div class="diary-edit-page">
    <AdminPageCard :title="isEdit ? '编辑日记' : '写日记'">
      <template #actions>
        <AdminButton variant="secondary" @click="goBack">返回</AdminButton>
        <AdminButton variant="danger" v-if="isEdit" :loading="loading" @click="onDelete">删除</AdminButton>
        <AdminButton variant="primary" :loading="loading" @click="onSave">保存</AdminButton>
      </template>

      <AdminForm>
        <AdminFormField label="内容">
          <AdminFormInput
            v-model="form.content"
            type="textarea"
            :rows="12"
            placeholder="记录你的想法..."
            :maxlength="3000"
          />
          <div class="char-count">{{ form.content.length }}/3000</div>
        </AdminFormField>

        <AdminFormField label="图片">
          <AdminImageUpload
            v-model="form.cover"
            :upload="uploadCoverImage"
            tip="支持 jpg/png 格式"
          />
        </AdminFormField>
      </AdminForm>
    </AdminPageCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessageBox } from '@/composables/useMessageBox'
import { getDiary, createDiary, updateDiary, deleteDiary } from '@/api/diary'
import { uploadImages } from '@/api/image'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import AdminForm from '@/components/admin/forms/AdminForm.vue'
import AdminFormField from '@/components/admin/forms/AdminFormField.vue'
import AdminFormInput from '@/components/admin/forms/AdminFormInput.vue'
import AdminImageUpload from '@/components/admin/AdminImageUpload.vue'

const route = useRoute()
const router = useRouter()
const { toast } = useMessageBox()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const diaryId = ref(null)
let draftPromise = null

const form = ref({
  content: '',
  cover: ''
})

onMounted(async () => {
  if (isEdit.value) {
    loading.value = true
    try {
      const res = await getDiary(Number(route.params.id))
      diaryId.value = res.id
      form.value.content = res.content
      form.value.cover = res.images?.[0] || ''
    } catch (e) {
      toast(e.message || '获取日记失败', 'error')
      goBack()
    } finally {
      loading.value = false
    }
  }
})

async function ensureDraft() {
  if (isEdit.value) return diaryId.value
  if (diaryId.value) return diaryId.value
  if (draftPromise) return draftPromise

  draftPromise = (async () => {
    try {
      const res = await createDiary({ content: form.value.content.trim() || '未命名日记' })
      diaryId.value = res.id
      return res.id
    } finally {
      draftPromise = null
    }
  })()

  return draftPromise
}

watch(
  () => form.value.content,
  () => {
    if (!isEdit.value && !diaryId.value && !draftPromise) {
      ensureDraft().catch(() => {})
    }
  }
)

async function uploadCoverImage(file) {
  const id = await ensureDraft()
  const result = await uploadImages({ files: [file], diaryId: id, type: 'cover' })
  return result.images[0]?.url || ''
}

async function onSave() {
  if (!form.value.content.trim()) {
    toast('请输入日记内容', 'error')
    return
  }

  loading.value = true
  try {
    const data = {
      content: form.value.content,
      images: form.value.cover ? [form.value.cover] : []
    }

    if (isEdit.value) {
      await updateDiary(diaryId.value, data)
      toast('保存成功')
    } else {
      if (diaryId.value) {
        await updateDiary(diaryId.value, data)
        toast('保存成功')
      } else {
        await createDiary(data)
        toast('创建成功')
      }
    }
    goBack()
  } catch (e) {
    toast(e.message || '保存失败', 'error')
  } finally {
    loading.value = false
  }
}

async function onDelete() {
  if (!confirm('确定要删除这条日记吗？')) return

  loading.value = true
  try {
    await deleteDiary(diaryId.value)
    toast('删除成功')
    goBack()
  } catch (e) {
    toast(e.message || '删除失败', 'error')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/admin/diaries')
}
</script>

<style scoped>
.diary-edit-page {
  width: 100%;
}

.char-count {
  font-size: 12px;
  color: var(--color-muted);
  text-align: right;
  margin-top: 4px;
}
</style>
