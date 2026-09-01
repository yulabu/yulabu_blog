<template>
  <span ref="triggerRef" class="tooltip-trigger" @mouseenter="onEnter" @mouseleave="onLeave">
    <slot />
  </span>
  <Teleport to="body">
    <Transition name="tooltip-fade">
      <div
        v-if="visible && content"
        ref="tipRef"
        class="admin-tooltip"
        :style="positionStyle"
      >
        {{ content }}
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue'

interface Props {
  content: string
  delay?: number
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
  delay: 200,
  placement: 'top'
})

const visible = ref(false)
const triggerRef = ref<HTMLElement>()
const tipRef = ref<HTMLElement>()
const positionStyle = ref<Record<string, string>>({})
let timer: ReturnType<typeof setTimeout> | null = null

function onEnter() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    visible.value = true
    nextTick(updatePosition)
  }, props.delay)
}

function onLeave() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  visible.value = false
}

function updatePosition() {
  if (!triggerRef.value || !tipRef.value) return
  const triggerRect = triggerRef.value.getBoundingClientRect()
  const tipRect = tipRef.value.getBoundingClientRect()
  const { clientWidth, clientHeight } = document.documentElement
  const gap = 8

  let top = 0
  let left = 0

  switch (props.placement) {
    case 'top':
      top = triggerRect.top - tipRect.height - gap
      left = triggerRect.left + (triggerRect.width - tipRect.width) / 2
      break
    case 'bottom':
      top = triggerRect.bottom + gap
      left = triggerRect.left + (triggerRect.width - tipRect.width) / 2
      break
    case 'left':
      top = triggerRect.top + (triggerRect.height - tipRect.height) / 2
      left = triggerRect.left - tipRect.width - gap
      break
    case 'right':
      top = triggerRect.top + (triggerRect.height - tipRect.height) / 2
      left = triggerRect.right + gap
      break
  }

  // 边界检测与翻转
  if (top < gap) top = triggerRect.bottom + gap
  if (left < gap) left = gap
  if (left + tipRect.width > clientWidth - gap) {
    left = clientWidth - tipRect.width - gap
  }
  if (top + tipRect.height > clientHeight - gap) {
    top = triggerRect.top - tipRect.height - gap
  }

  positionStyle.value = {
    top: `${top}px`,
    left: `${left}px`
  }
}

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.tooltip-trigger {
  display: inline-flex;
  align-items: center;
}

.admin-tooltip {
  position: fixed;
  z-index: 9999;
  max-width: 320px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-heading);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.8);
  pointer-events: none;
  word-break: break-all;
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
