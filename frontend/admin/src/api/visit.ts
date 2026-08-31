import http from '@/utils/http'
import type { PaginatedVisitLogs, VisitStats } from '@/types/api'

export function getAdminVisits(page = 1, limit = 20, dateRange?: string, ip?: string, postId?: number) {
  return http.get<PaginatedVisitLogs>('/admin/visits', {
    params: { page, limit, dateRange, ip, post_id: postId }
  })
}

export function getVisitStats() {
  return http.get<VisitStats>('/admin/visits/stats')
}

export function clearAllVisits() {
  return http.delete<{ message: string; deletedCount: number }>('/admin/visits')
}
