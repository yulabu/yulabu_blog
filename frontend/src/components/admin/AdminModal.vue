<template>
  <BaseModal
    class="admin-modal"
    v-bind="props"
    @update:visible="emit('update:visible', $event)"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
  >
    <template #default>
      <slot />
    </template>

    <template #title>
      <slot name="title" />
    </template>

    <template #footer>
      <slot name="footer">
        <AdminButton
          variant="secondary"
          :disabled="confirmLoading"
          @click="onCancel"
        >
          {{ cancelText }}
        </AdminButton>
        <AdminButton
          variant="primary"
          :disabled="confirmDisabled || confirmLoading"
          @click="onConfirm"
        >
          {{ confirmLoading ? '处理中...' : confirmText }}
        </AdminButton>
      </slot>
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from '@/components/common/BaseModal.vue'
import AdminButton from '@/components/admin/AdminButton.vue'

const props = defineProps({
  visible: { type: Boolean, required: true },
  title: { type: String, default: '' },
  width: { type: String, default: '360px' },
  maxWidth: { type: String, default: '90vw' },
  maxHeight: { type: String, default: '90vh' },
  closeOnOverlay: { type: Boolean, default: true },
  closeOnEsc: { type: Boolean, default: true },
  showFooter: { type: Boolean, default: true },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
  confirmLoading: { type: Boolean, default: false },
  confirmDisabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'confirm', 'cancel'])

function onCancel() {
  emit('update:visible', false)
  emit('cancel')
}

function onConfirm() {
  if (props.confirmDisabled || props.confirmLoading) return
  emit('confirm')
}
</script>

<style scoped>
.admin-modal :deep(.base-modal__overlay) {
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
}

.admin-modal :deep(.base-modal__dialog) {
  min-width: 360px;
  max-width: 480px;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border-top: 1px solid white;
  border-left: 1px solid white;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, .85),
      rgba(255, 255, 255, .65));
  backdrop-filter: blur(16px);
}

.admin-modal :deep(.base-modal__title) {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: rgb(45, 90, 65);
  margin: 0;
}
</style>
