import http from '@/utils/http'
import type { Notice } from '@/types/api'

export function getPublicNotices() {
  return http.get<{ notices: Notice[] }>('/notices')
}
