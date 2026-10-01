import http from '@/utils/http'
import type { Diary, PaginatedDiaries, IdResponse } from '@/types/api'

export function getDiaries(page = 1, pageSize = 20) {
  return http.get<PaginatedDiaries>('/admin/diaries', { params: { page, pageSize } })
}

export function getDiary(id: number) {
  return http.get<Diary>(`/admin/diaries/${id}`)
}

export function createDiary(data: { content: string; images?: string[] }) {
  return http.post<IdResponse>('/admin/diaries', data)
}

export function updateDiary(id: number, data: { content?: string; images?: string[] }) {
  return http.put<IdResponse>(`/admin/diaries/${id}`, data)
}

export function deleteDiary(id: number) {
  return http.delete<IdResponse>(`/admin/diaries/${id}`)
}

// 公开日记列表：admin 侧没有调用点（前台用 home 自己的 api），留作对照与将来的预览
export function getPublicDiaries(page = 1, pageSize = 20) {
  return http.get<PaginatedDiaries>('/diaries', { params: { page, pageSize } })
}
