import http from '@/utils/http'
import type { PaginatedDiaries } from '@/types/api'

// pageSize 默认值被 src/utils/serverData.ts 的 fetchDiaries 对齐引用：
// 两边必须一致，否则构建期烘焙的切片与客户端对账的切片不同，指纹永不相等
export function getPublicDiaries(page = 1, pageSize = 20) {
  return http.get<PaginatedDiaries>('/diaries', { params: { page, pageSize } })
}
