<template>
  <Teleport to="body">
    <!-- 遮罩层：alert 和 confirm 显示 -->
    <div
      v-if="state.visible && (state.type === 'alert' || state.type === 'confirm')"
      class="overlay"
      @click="onOverlayClick"
    >
      <div class="modal" @click.stop>
        <h3 v-if="state.title" class="modal-title">{{ state.title }}</h3>
        <p class="modal-message">{{ state.message }}</p>
        <div class="modal-actions">
          <button v-if="state.type === 'confirm'" class="btn btn-cancel" @click="onCancel">
            取消
          </button>
          <button class="btn btn-confirm" @click="onConfirm">
            {{ state.type === 'confirm' ? '确定' : '知道了' }}
          </button>
        </div>
      </div>
    </div>

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

const { state, close } = useMessageBox()

function onOverlayClick() {
  if (state.type === 'alert') {
    close(true)
  } else if (state.type === 'confirm') {
    close(false)
  }
}

function onConfirm() {
  close(true)
}

function onCancel() {
  close(false)
}
</script>

<style scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal {
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

.modal-title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: rgb(45, 90, 65);
  margin: 0 0 12px;
}

.modal-message {
  font-size: 14px;
  color: rgb(65, 110, 105);
  line-height: 1.6;
  margin: 0 0 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.btn-confirm {
  background: rgb(99, 149, 86);
  color: white;
}

.btn-confirm:hover {
  background: rgb(79, 129, 66);
}

.btn-cancel {
  background: rgba(80, 140, 134, 0.12);
  color: rgb(65, 110, 105);
}

.btn-cancel:hover {
  background: rgba(80, 140, 134, 0.22);
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
  background: rgb(99, 149, 86);
}

.toast-error {
  background: rgb(220, 90, 90);
}

.toast-info {
  background: rgb(80, 140, 134);
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
