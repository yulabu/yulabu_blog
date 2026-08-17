import http from '@/utils/http'
import type { Moment, PaginatedMoments } from '@/types/api'

export function getAdminMoments(page: number, limit: number, q?: string) {
  const params: Record<string, unknown> = { page, limit }
  if (q) params.q = q
  return http.get<PaginatedMoments>('/admin/moments', { params })
}

export function createMoment(data: { moment_content: string; moment_status?: string }) {
  return http.post<{ id: number; message: string }>('/admin/moments', data)
}

export function updateMoment(
  id: number,
  data: Partial<{ moment_content: string; moment_status: string }>
) {
  return http.put<{ id: number; message: string }>(`/admin/moments/${id}`, data)
}

export function deleteMoment(id: number) {
  return http.delete(`/admin/moments/${id}`)
}

export function uploadMomentImage(id: number, file: File) {
  const formData = new FormData()
  formData.append('image', file)
  return http.post<{ image: string; message: string }>(`/admin/moments/${id}/image`, formData)
}

export function removeMomentImage(id: number) {
  return http.delete<{ message: string }>(`/admin/moments/${id}/image`)
}
