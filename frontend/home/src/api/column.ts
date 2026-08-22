import http from '@/utils/http'
import type { ColumnItem, ColumnDetail, PrevNextPost } from '@/types/api'

export function getColumns() {
  return http.get<ColumnItem[]>('/columns')
}

export function getColumnDetail(id: number) {
  return http.get<ColumnDetail>(`/columns/${id}`)
}

export function getPrevPost(id: number) {
  return http.get<PrevNextPost>(`/posts/${id}/prev`)
}

export function getNextPost(id: number) {
  return http.get<PrevNextPost>(`/posts/${id}/next`)
}