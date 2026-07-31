<template>
  <BaseModal
    class="admin-modal"
    v-bind="props"
    @update:visible="emit('update:visible', $event)"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from '@/components/common/BaseModal.vue'

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

.admin-modal :deep(.base-modal__btn) {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.admin-modal :deep(.base-modal__btn:disabled) {
  cursor: not-allowed;
  opacity: 0.6;
}

.admin-modal :deep(.base-modal__btn--confirm) {
  background: rgb(99, 149, 86);
  color: white;
}

.admin-modal :deep(.base-modal__btn--confirm:hover:not(:disabled)) {
  background: rgb(79, 129, 66);
}

.admin-modal :deep(.base-modal__btn--cancel) {
  background: rgba(80, 140, 134, 0.12);
  color: rgb(65, 110, 65);
}

.admin-modal :deep(.base-modal__btn--cancel:hover:not(:disabled)) {
  background: rgba(80, 140, 134, 0.22);
}
</style>
