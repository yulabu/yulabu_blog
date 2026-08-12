import http from '@/utils/http'
import type { FriendLink } from '@/types/api'

export function getAdminFriendLinks() {
  return http.get<FriendLink[]>('/admin/friendlinks')
}

export function createFriendLink(data: {
  name: string
  url: string
  avatar?: string
  description?: string
  sort_order?: number
  status?: string
}) {
  return http.post<{ id: number; message: string }>('/admin/friendlinks', data)
}

export function updateFriendLink(
  id: number,
  data: Partial<{
    name: string
    url: string
    avatar: string
    description: string
    sort_order: number
    status: string
  }>
) {
  return http.put<{ id: number; message: string }>(`/admin/friendlinks/${id}`, data)
}

export function deleteFriendLink(id: number) {
  return http.delete(`/admin/friendlinks/${id}`)
}

export function fetchFriendLinkPreview(id: number) {
  return http.put<{ preview_image: string | null; message: string }>(`/admin/friendlinks/${id}/preview`)
}
