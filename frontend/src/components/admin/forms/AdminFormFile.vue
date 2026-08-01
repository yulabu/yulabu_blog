<template>
  <div class="admin-form-file">
    <input
      ref="inputRef"
      type="file"
      class="admin-form-file__input"
      :accept="accept"
      :webkitdirectory="directory"
      @change="onChange"
    />
    <p v-if="hint" class="admin-form-file__hint">{{ hint }}</p>
    <p v-if="selectedName" class="admin-form-file__selected">{{ selectedName }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: [Object, Array],
    default: null
  },
  accept: {
    type: String,
    default: ''
  },
  directory: {
    type: Boolean,
    default: false
  },
  hint: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const inputRef = ref(null)

const selectedName = computed(() => {
  const files = props.modelValue
  if (!files || files.length === 0) return ''
  const first = files[0]
  return first.webkitRelativePath
    ? first.webkitRelativePath.split('/')[0]
    : first.name
})

function onChange(e) {
  const files = e.target.files
  emit('update:modelValue', files)
  emit('change', files)
}

watch(() => props.modelValue, (val) => {
  if (!val && inputRef.value) {
    inputRef.value.value = ''
  }
})

function reset() {
  if (inputRef.value) {
    inputRef.value.value = ''
  }
}

defineExpose({ reset })
</script>

<style scoped>
.admin-form-file__input {
  width: 100%;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(80, 140, 134, 0.25);
  background: rgba(255, 255, 255, 0.5);
  color: var(--color-heading);
  font-size: 14px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  outline: none;
  transition: border-color 0.2s ease;
  cursor: pointer;
  box-sizing: border-box;
}

.admin-form-file__input:focus {
  border-color: var(--color-primary);
}

.admin-form-file__hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-muted);
}

.admin-form-file__selected {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--color-heading);
  word-break: break-all;
}
</style>
