import http from '@/utils/http'
import type { Tag } from '@/types/api'

export function getTags() {
  return http.get<Tag[]>('/tags')
}
