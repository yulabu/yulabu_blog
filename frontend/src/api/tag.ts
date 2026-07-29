import http from '@/utils/http'
import type { Tag, IdResponse } from '@/types/api'

export function getTags() {
  return http.get<Tag[]>('/tags')
}

export function createTag(name: string) {
  return http.post<IdResponse>('/tags', { tag_name: name })
}

export function updateTag(id: number, name: string) {
  return http.put<IdResponse>(`/tags/${id}`, { tag_name: name })
}

export function deleteTag(id: number) {
  return http.delete<{ message: string }>(`/tags/${id}`)
}
