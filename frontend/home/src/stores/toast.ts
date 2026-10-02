import { reactive, readonly } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

/**
 * 轻提示（toast）—— 全站唯一的反馈通道。
 *
 * 触发方与被渲染方分属不同岛（文章岛里 toast 一句，Layout 的 ToastHost 岛负责画），
 * 所以状态放模块作用域：同一份 ESM 模块图，同页所有岛 import 到的是同一个 ——
 * 与 stores/ui.ts、stores/tagFilter.ts 同一套做法（pinia 在各岛各注一份，跨岛不同步）。
 *
 * 只在客户端调用（都在 catch 分支里），SSR 期不会写这个模块。
 */
export interface ToastState {
  visible: boolean
  message: string
  toastType: ToastType
}

/** 展示时长：与改前一致（2s） */
const TOAST_DURATION_MS = 2000

const state = reactive<ToastState>({
  visible: false,
  message: '',
  toastType: 'success',
})

let timer: ReturnType<typeof setTimeout> | null = null

function hide() {
  state.visible = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function toast(message: string, toastType: ToastType = 'success') {
  state.message = message
  state.toastType = toastType
  state.visible = true
  // 连续两条提示时重置计时（改前不清旧计时器，第二条会被第一条的定时器提前收走）
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    state.visible = false
    timer = null
  }, TOAST_DURATION_MS)
}

export function useToast() {
  return { state: readonly(state), toast, hide }
}
