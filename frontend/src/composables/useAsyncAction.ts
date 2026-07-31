import { ref } from 'vue'
import { useMessageBox } from './useMessageBox'

export interface UseAsyncActionOptions<TArgs extends any[], TResult> {
  successMessage?: string | ((result: TResult, ...args: TArgs) => string)
  errorMessage?: string
  onSuccess?: (result: TResult, ...args: TArgs) => void | Promise<void>
  onError?: (error: any, ...args: TArgs) => void
}

export function useAsyncAction<TArgs extends any[] = any[], TResult = any>(
  action: (...args: TArgs) => Promise<TResult>,
  options: UseAsyncActionOptions<TArgs, TResult> = {}
) {
  const { toast } = useMessageBox()
  const loading = ref(false)

  async function run(...args: TArgs): Promise<TResult | undefined> {
    if (loading.value) return

    loading.value = true
    try {
      const result = await action(...args)
      const message = typeof options.successMessage === 'function'
        ? options.successMessage(result, ...args)
        : options.successMessage

      if (message) toast(message)
      await options.onSuccess?.(result, ...args)
      return result
    } catch (e: any) {
      console.error(e)
      toast(e.message || options.errorMessage || '操作失败', 'error')
      options.onError?.(e, ...args)
    } finally {
      loading.value = false
    }
  }

  return { run, loading }
}
