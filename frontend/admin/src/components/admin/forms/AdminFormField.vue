<template>
  <div class="admin-form-field">
    <label v-if="label" class="admin-form-field__label">
      {{ label }}
      <span v-if="required" class="admin-form-field__required">*</span>
    </label>
    <div class="admin-form-field__control">
      <slot />
    </div>
    <p v-if="hint" class="admin-form-field__hint">{{ hint }}</p>
    <p v-if="error" class="admin-form-field__error">{{ error }}</p>
  </div>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  hint: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.admin-form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.admin-form-field__label {
  font-size: 13px;
  color: var(--color-text);
  font-weight: 500;
}

.admin-form-field__required {
  color: #e74c3c;
  margin-left: 2px;
}

.admin-form-field__hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
}

.admin-form-field__error {
  margin: 0;
  font-size: 12px;
  color: #e74c3c;
}
</style>
