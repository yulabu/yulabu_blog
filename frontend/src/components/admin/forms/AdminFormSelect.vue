<template>
  <div class="admin-form-select">
    <select
      :value="modelValue"
      class="admin-form-select__control"
      :disabled="disabled"
      @change="onChange"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <slot name="append" />
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

function onChange(e) {
  const value = e.target.value
  emit('update:modelValue', value === '' ? '' : isNumberLike(value) ? Number(value) : value)
}

function isNumberLike(value) {
  return /^\d+$/.test(value)
}
</script>

<style scoped>
.admin-form-select {
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-form-select__control {
  flex: 1;
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

.admin-form-select__control:focus {
  border-color: rgb(99, 149, 86);
}
</style>
