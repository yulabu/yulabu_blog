<template>
  <div class="notice-edit-page">
    <AdminPageCard :title="isEdit ? '编辑公告' : '新建公告'">
      <template #actions>
        <AdminButton variant="secondary" @click="goBack">返回</AdminButton>
        <AdminButton variant="primary" @click="onSave">保存</AdminButton>
      </template>

      <AdminForm>
        <AdminFormField label="标题">
          <AdminFormInput v-model="form.title" placeholder="请输入公告标题" />
        </AdminFormField>

        <AdminFormRow inline>
          <AdminFormGroup>
            <AdminFormField label="状态">
              <AdminFormSelect v-model="form.status" :options="statusOptions" />
            </AdminFormField>
          </AdminFormGroup>
          <AdminFormGroup>
            <AdminFormField label="置顶">
              <AdminFormCheckbox v-model="form.isPinned" label="置顶公告" />
            </AdminFormField>
          </AdminFormGroup>
        </AdminFormRow>

        <AdminFormField label="内容">
          <AdminMarkdownField v-model="form.content" min-height="400px" />
        </AdminFormField>
      </AdminForm>
    </AdminPageCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessageBox } from '@/composables/useMessageBox'
import AdminButton from '@/components/admin/AdminButton.vue'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminForm from '@/components/admin/forms/AdminForm.vue'
import AdminFormRow from '@/components/admin/forms/AdminFormRow.vue'
import AdminFormGroup from '@/components/admin/forms/AdminFormGroup.vue'
import AdminFormField from '@/components/admin/forms/AdminFormField.vue'
import AdminFormInput from '@/components/admin/forms/AdminFormInput.vue'
import AdminFormSelect from '@/components/admin/forms/AdminFormSelect.vue'
import AdminFormCheckbox from '@/components/admin/forms/AdminFormCheckbox.vue'
import AdminMarkdownField from '@/components/admin/forms/AdminMarkdownField.vue'
import { getNotice, createNotice, updateNotice } from '@/api/notice'

const route = useRoute()
const router = useRouter()
const { toast } = useMessageBox()

const isEdit = computed(() => !!route.params.id)

const form = ref({
  title: '',
  content: '',
  status: 'show',
  isPinned: false
})

const loading = ref(false)

const statusOptions = [
  { value: 'show', label: '显示' },
  { value: 'hide', label: '隐藏' }
]

async function fetchNotice() {
  if (!isEdit.value) return
  try {
    const notice = await getNotice(Number(route.params.id))
    form.value = {
      title: notice.notice_title || '',
      content: notice.notice_content || '',
      status: notice.notice_status || 'show',
      isPinned: !!notice.notice_is_pinned
    }
  } catch (e) {
    toast('获取公告失败', 'error')
  }
}

async function onSave() {
  const title = form.value.title.trim()
  const content = form.value.content.trim()

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
    const noticeForm = {
      title,
      content,
      status: form.value.status,
      isPinned: form.value.isPinned
    }

    if (isEdit.value) {
      await updateNotice(Number(route.params.id), noticeForm)
    } else {
      await createNotice(noticeForm)
    }

    toast(isEdit.value ? '保存成功' : '创建成功')
    router.push('/admin/notices')
  } catch (e) {
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
</style>
