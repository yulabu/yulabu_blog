<template>
  <button
    class="admin-button"
    :class="[
      `admin-button--${variant}`,
      { 'admin-button--loading': loading }
    ]"
    :type="type"
    :disabled="disabled || loading"
  >
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'text',
    validator: (value) => ['primary', 'secondary', 'text', 'danger'].includes(value)
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'button'
  }
})
</script>

<style scoped>
.admin-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  transition: background 0.2s ease, opacity 0.2s ease;
  cursor: pointer;
}

.admin-button:disabled,
.admin-button--loading {
  cursor: not-allowed;
  opacity: 0.6;
}

.admin-button--primary {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: var(--color-primary);
  color: white;
  font-size: 13px;
}

.admin-button--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.admin-button--secondary {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: rgba(var(--color-accent-rgb), 0.12);
  color: var(--color-text);
  font-size: 13px;
}

.admin-button--secondary:hover:not(:disabled) {
  background: rgba(var(--color-accent-rgb), 0.22);
}

.admin-button--text,
.admin-button--danger {
  padding: 4px 10px;
  border: none;
  background: transparent;
  font-size: 13px;
  border-radius: 6px;
}

.admin-button--text {
  color: var(--color-primary);
}

.admin-button--text:hover:not(:disabled) {
  background: rgba(var(--color-primary-rgb), 0.1);
}

.admin-button--danger {
  color: var(--color-danger);
}

.admin-button--danger:hover:not(:disabled) {
  background: rgba(var(--color-danger-rgb), 0.1);
}
</style>
