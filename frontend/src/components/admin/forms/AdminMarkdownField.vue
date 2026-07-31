<template>
  <div class="admin-markdown-field" :style="{ minHeight }">
    <MdEditor
      v-model="value"
      theme="light"
      previewTheme="github"
      codeTheme="github"
      :showCodeRowNumber="true"
      :toolbars="toolbars"
      class="admin-markdown-field__editor"
      @onUploadImg="handleUpload"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  uploadImages: {
    type: Function,
    default: null
  },
  minHeight: {
    type: String,
    default: '500px'
  }
})

const emit = defineEmits(['update:modelValue'])

const value = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

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

async function handleUpload(files, callback) {
  if (!props.uploadImages) return
  try {
    const urls = await props.uploadImages(files)
    callback(urls)
  } catch (e) {
    console.error(e)
  }
}
</script>

<style scoped>
.admin-markdown-field {
  border-radius: 8px;
  overflow: hidden;
}

.admin-markdown-field__editor {
  border-radius: 8px;
  overflow: hidden;
}
</style>
