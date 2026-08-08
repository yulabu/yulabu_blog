import http from '@/utils/http'
import type { Notice, NoticeForm, IdResponse } from '@/types/api'

export function getPublicNotices() {
  return http.get<{ notices: Notice[] }>('/notices')
}

export function getAdminNotices() {
  return http.get<{ notices: Notice[] }>('/admin/notices')
}

export function getNotice(id: number) {
  return http.get<Notice>(`/admin/notices/${id}`)
}

export function createNotice(form: NoticeForm) {
  return http.post<IdResponse>('/admin/notices', {
    notice_title: form.title,
    notice_content: form.content,
    notice_status: form.status,
    notice_is_pinned: form.isPinned
  })
}

export function updateNotice(id: number, form: Partial<NoticeForm>) {
  const payload: Record<string, unknown> = {}
  if (form.title !== undefined) payload.notice_title = form.title
  if (form.content !== undefined) payload.notice_content = form.content
  if (form.status !== undefined) payload.notice_status = form.status
  if (form.isPinned !== undefined) payload.notice_is_pinned = form.isPinned

  return http.put<IdResponse>(`/admin/notices/${id}`, payload)
}

export function deleteNotice(id: number) {
  return http.delete<{ message: string }>(`/admin/notices/${id}`)
}

export function togglePin(id: number) {
  return http.put<{
    notice_id: number
    notice_is_pinned: boolean
    message: string
  }>(`/admin/notices/${id}/pin`)
}
