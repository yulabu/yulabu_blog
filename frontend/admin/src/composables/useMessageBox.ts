import { reactive, readonly } from 'vue'

type MessageBoxType = 'alert' | 'confirm' | 'toast'
type ToastType = 'success' | 'error' | 'info'

interface MessageBoxState {
  visible: boolean
  type: MessageBoxType
  title: string
  message: string
  toastType: ToastType
  resolve: ((value: boolean) => void) | null
}

const state = reactive<MessageBoxState>({
  visible: false,
  type: 'alert',
  title: '',
  message: '',
  toastType: 'success',
  resolve: null
})

// 用于存储 toast 定时器 ID
let toastTimer: ReturnType<typeof setTimeout> | null = null

function clearToastTimer() {
  if (toastTimer !== null) {
    clearTimeout(toastTimer)
    toastTimer = null
  }
}

function show(type: MessageBoxType, title: string, message: string) {
  clearToastTimer() // 显示新对话框时清除旧的 toast 定时器
  state.type = type
  state.title = title
  state.message = message
  state.visible = true
}

export function useMessageBox() {
  return {
    state: readonly(state),
    alert(title: string, message: string) {
      show('alert', title, message)
    },
    confirm(title: string, message: string): Promise<boolean> {
      show('confirm', title, message)
      return new Promise((resolve) => {
        state.resolve = resolve
      })
    },
    toast(message: string, toastType: ToastType = 'success') {
      state.toastType = toastType
      show('toast', '', message)
      toastTimer = setTimeout(() => {
        state.visible = false
        toastTimer = null
      }, 2000)
    },
    close(result: boolean) {
      clearToastTimer()
      state.visible = false
      if (state.resolve) {
        state.resolve(result)
        state.resolve = null
      }
    }
  }
}
