<template>
  <div class="admin-image-upload">
    <div
      class="upload-area"
      :class="{ 'dragging': dragging, 'uploading': uploading }"
      @click="pickFile"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <template v-if="uploading">
        <span class="area-text">上传中...</span>
      </template>

      <template v-else-if="modelValue">
        <img :src="modelValue" class="area-preview" alt="预览图" />
        <button
          type="button"
          class="area-remove"
          title="移除图片"
          @click.stop="emit('update:modelValue', '')"
        >
          ✕
        </button>
      </template>

      <template v-else>
        <span class="area-plus">+</span>
        <span class="area-text">请上传封面</span>
      </template>
    </div>

    <input
      ref="inputRef"
      type="file"
      class="hidden-input"
      :accept="accept"
      @change="onFileChange"
    />

    <p v-if="tip" class="upload-tip">{{ tip }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMessageBox } from '@/composables/useMessageBox'

const props = defineProps({
  modelValue: { type: String, default: null },
  upload: { type: Function, required: true },
  accept: { type: String, default: 'image/jpeg,image/png' },
  tip: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
const { toast } = useMessageBox()

const inputRef = ref(null)
const dragging = ref(false)
const uploading = ref(false)
const MAX_SIZE = 5 * 1024 * 1024

function pickFile() {
  if (uploading.value) return
  inputRef.value?.click()
}

function onDrop(e) {
  dragging.value = false
  if (uploading.value) return
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

function onFileChange() {
  const file = inputRef.value?.files?.[0]
  if (file) handleFile(file)
  inputRef.value.value = ''
}

async function handleFile(file) {
  if (!file.type || !file.type.startsWith('image/')) {
    toast('仅支持图片文件', 'error')
    return
  }
  if (file.size > MAX_SIZE) {
    toast('图片不能超过 5MB', 'error')
    return
  }

  uploading.value = true
  try {
    const url = await props.upload(file)
    emit('update:modelValue', url)
  } catch (e) {
    toast(e.message || '上传失败', 'error')
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.admin-image-upload {
  display: inline-block;
}

.upload-area {
  position: relative;
  width: 400px;
  max-width: 100%;
  height: 150px;
  border: 1px dashed #d0d3d9;
  border-radius: 8px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  overflow: hidden;
}

.upload-area:hover {
  border-color: var(--color-primary, #165dff);
}

.upload-area.dragging {
  border-color: var(--color-primary, #165dff);
  background: rgba(22, 93, 255, 0.03);
}

.upload-area.uploading {
  cursor: default;
  border-color: var(--color-primary, #165dff);
}

.area-plus {
  font-size: 28px;
  font-weight: 300;
  color: #a9adba;
  line-height: 1;
}

.area-text {
  font-size: 13px;
  color: var(--color-muted, #86909c);
}

.area-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.area-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #ffffff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.upload-area:hover .area-remove {
  opacity: 1;
}

.hidden-input {
  display: none;
}

.upload-tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--color-muted, #86909c);
}
</style>
