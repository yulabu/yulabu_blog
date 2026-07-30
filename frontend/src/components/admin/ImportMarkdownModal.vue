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
    <div class="form-row">
      <label class="form-label">Markdown 正文</label>
      <textarea
        v-model="markdown"
        class="form-input markdown-input"
        placeholder="把 Markdown 全文粘贴到这里"
        rows="8"
      ></textarea>
    </div>

    <div class="form-row">
      <label class="form-label">选择图片文件夹</label>
      <input
        ref="fileInputRef"
        type="file"
        webkitdirectory
        class="form-input file-input"
        @change="onFileChange"
      />
      <p class="hint">
        请选择包含 Markdown 文件和图片 assets 的文件夹（Chrome / Edge 支持文件夹选择）
      </p>
      <p v-if="selectedFolderName" class="selected-folder">
        已选择：{{ selectedFolderName }}
      </p>
    </div>
  </AdminModal>
</template>

<script setup>
import { ref, computed } from 'vue'
import AdminModal from '@/components/admin/AdminModal.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['confirm', 'cancel'])

const markdown = ref('')
const files = ref(null)
const fileInputRef = ref(null)

const selectedFolderName = computed(() => {
  if (!files.value || files.value.length === 0) return ''
  const first = files.value[0]
  return first.webkitRelativePath
    ? first.webkitRelativePath.split('/')[0]
    : first.name
})

const canConfirm = computed(() => {
  return markdown.value.trim().length > 0 && files.value && files.value.length > 0
})

function onFileChange(e) {
  files.value = e.target.files
}

function onConfirm() {
  if (!canConfirm.value) return
  emit('confirm', { markdown: markdown.value, files: files.value })
}

function onCancel() {
  markdown.value = ''
  files.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
  emit('cancel')
}

function reset() {
  markdown.value = ''
  files.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

defineExpose({ reset })
</script>

<style scoped>
.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
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

.markdown-input {
  min-height: 160px;
  resize: vertical;
  line-height: 1.6;
}

.file-input {
  padding: 6px;
  cursor: pointer;
}

.hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: rgb(120, 140, 125);
}

.selected-folder {
  margin: 8px 0 0;
  font-size: 13px;
  color: rgb(45, 90, 65);
  word-break: break-all;
}
</style>
