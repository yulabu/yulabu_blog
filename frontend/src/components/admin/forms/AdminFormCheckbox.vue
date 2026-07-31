<template>
  <label class="admin-form-checkbox">
    <input
      :checked="modelValue"
      type="checkbox"
      class="admin-form-checkbox__input"
      @change="emit('update:modelValue', $event.target.checked)"
    />
    <span class="admin-form-checkbox__label">{{ label }}</span>
  </label>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])
</script>

<style scoped>
.admin-form-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 0;
  color: rgb(45, 90, 65);
  font-size: 14px;
  cursor: pointer;
}

.admin-form-checkbox__input {
  width: 16px;
  height: 16px;
  accent-color: rgb(99, 149, 86);
  cursor: pointer;
}

.admin-form-checkbox__label {
  user-select: none;
}
</style>
