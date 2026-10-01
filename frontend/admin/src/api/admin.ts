import http from '@/utils/http'
import type {
  DashboardStats,
  DashboardChartData,
  PaginatedAdmins,
  Admin,
  AdminForm,
  IdResponse
} from '@/types/api'

export function getDashboard() {
  return http.get<DashboardStats>('/admin/dashboard')
}

export function getDashboardCharts(range: '7days' | '30days' = '7days') {
  return http.get<DashboardChartData>('/admin/dashboard/charts', { params: { range } })
}

export function getCurrentAdmin() {
  return http.get<Admin>('/admin/admins/me')
}

export function getAdmins(page = 1, limit = 10) {
  return http.get<PaginatedAdmins>('/admin/admins', { params: { page, limit } })
}

// 写接口统一回 { id, message }（见后端 README 的「成功响应契约」）；
// 需要最新资料时单独 GET /admin/admins/me（AdminUserList 改自己资料后就是这么刷新的）
export function createAdmin(form: AdminForm) {
  return http.post<IdResponse>('/admin/admins', {
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

  return http.put<IdResponse>(`/admin/admins/${id}`, payload)
}

export function deleteAdmin(id: number) {
  return http.delete<IdResponse>(`/admin/admins/${id}`)
}
