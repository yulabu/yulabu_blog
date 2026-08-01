<template>
  <input
    v-if="type !== 'textarea'"
    ref="inputRef"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :autofocus="autofocus"
    class="admin-form-input"
    @input="onInput"
    @blur="emit('blur', $event)"
    @keyup.enter="emit('keyup.enter', $event)"
  />
  <textarea
    v-else
    ref="inputRef"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :autofocus="autofocus"
    :rows="rows"
    class="admin-form-input admin-form-input--textarea"
    @input="onInput"
    @blur="emit('blur', $event)"
    @keyup.enter="emit('keyup.enter', $event)"
  ></textarea>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  autofocus: {
    type: Boolean,
    default: false
  },
  rows: {
    type: Number,
    default: 8
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'keyup.enter'])

const inputRef = ref(null)

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

function focus() {
  inputRef.value?.focus()
}

defineExpose({ focus, inputRef })
</script>

<style scoped>
.admin-form-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(80, 140, 134, 0.25);
  background: rgba(255, 255, 255, 0.5);
  color: rgb(45, 90, 65);
  font-size: 14px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.admin-form-input:focus {
  border-color: rgb(99, 149, 86);
}

.admin-form-input::placeholder {
  color: rgba(65, 110, 105, 0.5);
}

.admin-form-input--textarea {
  min-height: 160px;
  resize: vertical;
  line-height: 1.6;
}
</style>
