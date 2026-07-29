import http from '@/utils/http'
import type {
  DashboardStats,
  Post,
  PaginatedAdmins,
  Admin,
  AdminForm,
  IdResponse
} from '@/types/api'

export function getDashboard() {
  return http.get<DashboardStats>('/admin/dashboard')
}

export function getTrashPosts(page = 1, limit = 10) {
  return http.get<{ posts: Post[]; total: number; page: number; totalPages: number }>(
    '/admin/posts/trash',
    { params: { page, limit } }
  )
}

export function restorePost(id: number) {
  return http.put<{ message: string }>(`/admin/posts/${id}/restore`)
}

export function forceDeletePost(id: number) {
  return http.delete<{ message: string }>(`/admin/posts/${id}/force`)
}

export function getAdmins(page = 1, limit = 10) {
  return http.get<PaginatedAdmins>('/admin/admins', { params: { page, limit } })
}

export function createAdmin(form: AdminForm) {
  return http.post<Admin>('/admin/admins', {
    admin_name: form.name,
    admin_password: form.password,
    admin_avatar: form.avatar || null
  })
}

export function updateAdmin(id: number, form: AdminForm) {
  const payload: Record<string, unknown> = {}
  if (form.name !== undefined) payload.admin_name = form.name
  if (form.avatar !== undefined) payload.admin_avatar = form.avatar || null
  if (form.oldPassword !== undefined) payload.old_password = form.oldPassword
  if (form.newPassword !== undefined) payload.new_password = form.newPassword

  return http.put<Admin>(`/admin/admins/${id}`, payload)
}

export function deleteAdmin(id: number) {
  return http.delete<{ message: string }>(`/admin/admins/${id}`)
}
