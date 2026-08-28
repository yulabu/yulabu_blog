<template>
  <div class="column-edit-page">
    <AdminPageCard :title="isEdit ? '编辑专栏' : '新建专栏'">
      <template #title-extra>
        <AdminStatusBadge :type="currentStatus" />
      </template>
      <template #actions>
        <AdminButton variant="secondary" @click="goBack">返回</AdminButton>
        <AdminButton variant="primary" :loading="loading" @click="onSave">保存</AdminButton>
      </template>

      <AdminForm>
        <AdminFormField label="名称" required>
          <AdminFormInput
            v-model="form.name"
            placeholder="请输入专栏名称"
            @keyup.enter="onSave"
          />
        </AdminFormField>

        <AdminFormField label="简介" hint="不超过128字，可选">
          <AdminFormInput
            v-model="form.desc"
            type="textarea"
            :rows="3"
            placeholder="请输入专栏简介"
          />
        </AdminFormField>

        <AdminFormField label="封面图" hint="点击或拖拽上传，建议 16/9，jpg/png 格式">
          <AdminImageUpload
            v-model="form.cover"
            :upload="uploadCover"
            tip="保存后封面即时生效；返回未保存将放弃本次上传"
          />
        </AdminFormField>

        <AdminFormRow inline>
          <AdminFormGroup>
            <AdminFormField label="排序" hint="数值越小越靠前">
              <AdminFormInput
                v-model.number="form.sort_order"
                type="number"
                placeholder="0"
              />
            </AdminFormField>
          </AdminFormGroup>
          <AdminFormGroup>
            <AdminFormField label="状态">
              <AdminFormSelect
                v-model="form.status"
                :options="statusOptions"
              />
            </AdminFormField>
          </AdminFormGroup>
        </AdminFormRow>
      </AdminForm>
    </AdminPageCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessageBox } from '@/composables/useMessageBox'
import { getAdminColumns, createColumn, updateColumn, deleteColumn, uploadColumnCover } from '@/api/column'
import AdminButton from '@/components/admin/AdminButton.vue'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge.vue'
import AdminImageUpload from '@/components/admin/AdminImageUpload.vue'
import AdminForm from '@/components/admin/forms/AdminForm.vue'
import AdminFormRow from '@/components/admin/forms/AdminFormRow.vue'
import AdminFormGroup from '@/components/admin/forms/AdminFormGroup.vue'
import AdminFormField from '@/components/admin/forms/AdminFormField.vue'
import AdminFormInput from '@/components/admin/forms/AdminFormInput.vue'
import AdminFormSelect from '@/components/admin/forms/AdminFormSelect.vue'

const route = useRoute()
const router = useRouter()
const { toast } = useMessageBox()

const isEdit = computed(() => !!route.params.id)
const currentStatus = ref('draft')
const loading = ref(false)

// 新建页挂载即建占位草稿（对齐 ensureDraft 惯例）；未保存离开则删除
const draftColumnId = ref(null)
const saved = ref(false)

const form = ref({
  name: '',
  desc: '',
  cover: '',
  sort_order: 0,
  status: 'show'
})

const statusOptions = [
  { value: 'show', label: '显示' },
  { value: 'hide', label: '隐藏' }
]

async function fetchColumn() {
  if (!isEdit.value) return
  try {
    const columns = await getAdminColumns()
    const column = columns.find(c => c.id === Number(route.params.id))
    if (!column) {
      toast('专栏不存在', 'error')
      return
    }
    form.value = {
      name: column.name,
      desc: column.desc || '',
      cover: column.cover || '',
      sort_order: column.sort_order,
      status: column.status === 'draft' ? 'show' : column.status
    }
    currentStatus.value = column.status
  } catch (e) {
    toast('获取专栏失败', 'error')
  }
}

async function ensureDraft() {
  if (draftColumnId.value) return draftColumnId.value
  const res = await createColumn({ column_name: '未命名专栏', status: 'draft' })
  draftColumnId.value = res.id
  return draftColumnId.value
}

// 封面上传：一次一张；编辑绑定现有专栏，新建绑定占位草稿
async function uploadCover(file) {
  const targetId = isEdit.value ? Number(route.params.id) : await ensureDraft()
  const result = await uploadColumnCover(targetId, file)
  return result.image.url
}

async function onSave() {
  if (loading.value) return

  const name = form.value.name.trim()
  if (!name) {
    toast('专栏名称不能为空', 'error')
    return
  }

  loading.value = true
  try {
    const payload = {
      column_name: name,
      column_desc: form.value.desc.trim() || undefined,
      column_cover: form.value.cover.trim() || undefined,
      sort_order: form.value.sort_order,
      status: form.value.status
    }

    if (isEdit.value) {
      await updateColumn(Number(route.params.id), payload)
    } else {
      const draftId = await ensureDraft()
      await updateColumn(draftId, payload)
    }

    saved.value = true
    toast(isEdit.value ? '保存成功' : '创建成功')
    router.push('/admin/columns')
  } catch (e) {
    toast(e.message || '保存失败', 'error')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/admin/columns')
}

// 离开且未保存：删除占位草稿（封面图随之解绑进孤儿 GC）
onUnmounted(() => {
  if (draftColumnId.value && !saved.value) {
    deleteColumn(draftColumnId.value).catch(() => {})
  }
})

onMounted(async () => {
  if (isEdit.value) {
    await fetchColumn()
  } else {
    await ensureDraft()
  }
})
</script>

<style scoped>
.column-edit-page {
  width: 100%;
}
</style>