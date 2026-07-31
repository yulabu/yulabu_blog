import { ref, watch, onMounted } from 'vue'
import { useMessageBox } from './useMessageBox'

export interface UseAdminListOptions<T> {
  pageSize?: number
  paginated?: boolean
  immediate?: boolean
  errorMessage?: string
  extractList?: (data: any) => T[]
  extractTotalPages?: (data: any) => number
}

export function useAdminList<T = any>(
  fetchFn: (page: number, pageSize: number) => Promise<any>,
  options: UseAdminListOptions<T> = {}
) {
  const {
    pageSize = 10,
    paginated = true,
    immediate = true,
    errorMessage = '获取列表失败',
    extractList = (data) => data?.list ?? data,
    extractTotalPages = (data) => data?.totalPages ?? 1
  } = options

  const { toast } = useMessageBox()
  const items = ref<T[]>([])
  const loading = ref(false)
  const page = ref(1)
  const totalPages = ref(1)

  async function fetch() {
    loading.value = true
    try {
      const data = await fetchFn(page.value, pageSize)
      items.value = extractList(data) ?? []
      totalPages.value = paginated ? extractTotalPages(data) : 1
    } catch (e) {
      console.error(e)
      toast(errorMessage, 'error')
    } finally {
      loading.value = false
    }
  }

  function refresh() {
    return fetch()
  }

  if (immediate) {
    if (paginated) {
      watch(page, fetch, { immediate: true })
    } else {
      onMounted(fetch)
    }
  }

  return { items, loading, page, totalPages, fetch, refresh }
}
