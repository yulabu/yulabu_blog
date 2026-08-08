<template>
  <Transition name="base-modal-fade">
    <div
      v-if="visible"
      class="base-modal__overlay"
      @click="onOverlayClick"
    >
      <div
        class="base-modal__dialog"
        :style="dialogStyle"
        @click.stop
      >
        <div v-if="$slots.title || title" class="base-modal__header">
          <slot name="title">
            <h3 class="base-modal__title">{{ title }}</h3>
          </slot>
        </div>

        <div class="base-modal__body">
          <slot />
        </div>

        <div v-if="showFooter" class="base-modal__footer">
          <slot name="footer">
            <button
              class="base-modal__btn base-modal__btn--cancel"
              :disabled="confirmLoading"
              @click="onCancel"
            >
              {{ cancelText }}
            </button>
            <button
              class="base-modal__btn base-modal__btn--confirm"
              :disabled="confirmDisabled || confirmLoading"
              @click="onConfirm"
            >
              {{ confirmLoading ? '处理中...' : confirmText }}
            </button>
          </slot>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue'

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

const dialogStyle = computed(() => ({
  width: props.width,
  maxWidth: props.maxWidth,
  maxHeight: props.maxHeight
}))

function close() {
  emit('update:visible', false)
}

function onOverlayClick() {
  if (!props.closeOnOverlay) return
  close()
  emit('cancel')
}

function onCancel() {
  close()
  emit('cancel')
}

function onConfirm() {
  if (props.confirmDisabled || props.confirmLoading) return
  emit('confirm')
}

function onKeydown(e) {
  if (e.key === 'Escape' && props.visible && props.closeOnEsc) {
    close()
    emit('cancel')
  }
}

let originalOverflow = ''

watch(() => props.visible, (val) => {
  if (val) {
    originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = originalOverflow || ''
  }
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = originalOverflow || ''
})
</script>

<style scoped>
.base-modal__overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.base-modal__dialog {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  padding: 24px;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.base-modal__header {
  margin-bottom: 16px;
}

.base-modal__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.base-modal__body {
  flex: 1;
  min-height: 0;
}

.base-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.base-modal__btn {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.base-modal__btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.base-modal__btn--confirm {
  background: #333;
  color: #fff;
}

.base-modal__btn--confirm:hover:not(:disabled) {
  background: #555;
}

.base-modal__btn--cancel {
  background: #eee;
  color: #333;
}

.base-modal__btn--cancel:hover:not(:disabled) {
  background: #ddd;
}

.base-modal-fade-enter-active,
.base-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.base-modal-fade-enter-from,
.base-modal-fade-leave-to {
  opacity: 0;
}
</style>
