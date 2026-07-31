import { ref } from 'vue'
import { useMessageBox } from './useMessageBox'

export interface UseConfirmDeleteOptions<T> {
  title?: string
  message?: string | ((item: T) => string)
  successMessage?: string
  errorMessage?: string
  onSuccess?: () => void | Promise<void>
}

export function useConfirmDelete<T = any>(
  deleteFn: (item: T) => Promise<any>,
  options: UseConfirmDeleteOptions<T> = {}
) {
  const { confirm, toast } = useMessageBox()
  const loading = ref(false)

  async function confirmDelete(item: T) {
    if (loading.value) return

    const message = typeof options.message === 'function'
      ? options.message(item)
      : (options.message ?? '确定要删除吗？')

    const ok = await confirm(options.title || '删除确认', message)
    if (!ok) return

    loading.value = true
    try {
      await deleteFn(item)
      toast(options.successMessage || '删除成功')
      await options.onSuccess?.()
    } catch (e: any) {
      console.error(e)
      toast(e.message || options.errorMessage || '删除失败', 'error')
    } finally {
      loading.value = false
    }
  }

  return { confirmDelete, loading }
}
