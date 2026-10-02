<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="state.visible" class="toast" :class="`toast-${state.toastType}`">
        <span>{{ state.message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
/**
 * toast 的渲染宿主（整岛 client:only，挂在 Layout.astro）。
 *
 * 状态与 API 在 stores/toast.ts：触发方（文章岛）与渲染方分属不同岛，靠模块级单例联通。
 * 这里只负责画。改前这个位置叫 MessageBox，还带着一套无人调用的 alert/confirm 弹窗
 * （连带 BaseModal 210 行）—— 已随本次重构删除，只留真正在用的 toast。
 */
import { useToast } from '@/stores/toast'

const { state } = useToast()
</script>

<style scoped>
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
