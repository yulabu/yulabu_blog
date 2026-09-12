import http from '@/utils/http'
import type { SiteSettings } from '@/types/api'

export function getSettings() {
  return http.get<SiteSettings>('/admin/settings')
}

export function updateSettings(data: Partial<SiteSettings>) {
  return http.put<SiteSettings & { message: string }>('/admin/settings', data)
}
