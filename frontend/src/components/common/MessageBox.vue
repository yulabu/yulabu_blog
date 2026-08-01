<template>
  <Teleport to="body">
    <BaseModal
      v-if="state.visible && (state.type === 'alert' || state.type === 'confirm')"
      class="message-box-modal"
      :visible="state.visible"
      :title="state.title"
      @cancel="onCancel"
    >
      <p class="modal-message">{{ state.message }}</p>

      <template #footer>
        <button
          v-if="state.type === 'confirm'"
          class="message-box-btn message-box-btn--cancel"
          @click="onCancel"
        >
          取消
        </button>
        <button
          class="message-box-btn message-box-btn--confirm"
          @click="onConfirm"
        >
          {{ state.type === 'confirm' ? '确定' : '知道了' }}
        </button>
      </template>
    </BaseModal>

    <!-- toast -->
    <Transition name="toast">
      <div
        v-if="state.visible && state.type === 'toast'"
        class="toast"
        :class="`toast-${state.toastType}`"
      >
        <span>{{ state.message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useMessageBox } from '@/composables/useMessageBox'
import BaseModal from '@/components/common/BaseModal.vue'

const { state, close } = useMessageBox()

function onConfirm() {
  close(true)
}

function onCancel() {
  close(false)
}
</script>

<style scoped>
.message-box-modal :deep(.base-modal__overlay) {
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
}

.message-box-modal :deep(.base-modal__dialog) {
  min-width: 320px;
  max-width: 420px;
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

.message-box-modal :deep(.base-modal__title) {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.modal-message {
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.6;
  margin: 0;
}

.message-box-btn {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.message-box-btn--confirm {
  background: var(--color-primary);
  color: white;
}

.message-box-btn--confirm:hover {
  background: var(--color-primary-hover);
}

.message-box-btn--cancel {
  background: rgba(var(--color-accent-rgb), 0.12);
  color: rgb(65, 110, 65);
}

.message-box-btn--cancel:hover {
  background: rgba(var(--color-accent-rgb), 0.22);
}

.toast {
  position: fixed;
  top: 24px;
  right: 24px;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.toast-success {
  background: var(--color-primary);
}

.toast-error {
  background: var(--color-danger-hover);
}

.toast-info {
  background: var(--color-accent);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
