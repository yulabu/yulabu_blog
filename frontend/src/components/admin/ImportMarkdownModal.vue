<template>
  <AdminModal
    :visible="visible"
    title="导入本地 Markdown"
    confirm-text="导入"
    width="480px"
    :confirm-loading="loading"
    :confirm-disabled="!canConfirm"
    @update:visible="onCancel"
    @confirm="onConfirm"
    @cancel="onCancel"
  >
    <AdminFormField label="Markdown 正文">
      <AdminFormInput
        v-model="markdown"
        type="textarea"
        placeholder="把 Markdown 全文粘贴到这里"
        :rows="8"
      />
    </AdminFormField>

    <AdminFormField
      label="选择图片文件夹"
      hint="请选择包含 Markdown 文件和图片 assets 的文件夹（Chrome / Edge 支持文件夹选择）"
    >
      <AdminFormFile
        ref="fileInputRef"
        v-model="files"
        directory
      />
    </AdminFormField>
  </AdminModal>
</template>

<script setup>
import { ref, computed } from 'vue'
import AdminModal from '@/components/admin/AdminModal.vue'
import AdminFormField from '@/components/admin/forms/AdminFormField.vue'
import AdminFormInput from '@/components/admin/forms/AdminFormInput.vue'
import AdminFormFile from '@/components/admin/forms/AdminFormFile.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['confirm', 'cancel'])

const markdown = ref('')
const files = ref(null)
const fileInputRef = ref(null)

const canConfirm = computed(() => {
  return markdown.value.trim().length > 0 && files.value && files.value.length > 0
})

function onConfirm() {
  if (!canConfirm.value) return
  emit('confirm', { markdown: markdown.value, files: files.value })
}

function onCancel() {
  markdown.value = ''
  files.value = null
  fileInputRef.value?.reset()
  emit('cancel')
}

function reset() {
  markdown.value = ''
  files.value = null
  fileInputRef.value?.reset()
}

defineExpose({ reset })
</script>

<style scoped>
</style>
