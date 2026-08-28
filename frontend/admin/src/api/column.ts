import http from '@/utils/http'
import type { ColumnItem, ColumnPostsData, IdResponse, MessageResponse } from '@/types/api'

export function getAdminColumns() {
  return http.get<ColumnItem[]>('/admin/columns')
}

// 专栏封面上传：一次一张，绑定到指定专栏
export function uploadColumnCover(id: number, file: File) {
  const formData = new FormData()
  formData.append('image', file)
  return http.post<{ image: { image_id: number; url: string; thumb_url: string } }>(
    `/admin/columns/${id}/cover`,
    formData
  )
}

export function createColumn(data: {
  column_name: string
  column_desc?: string
  column_cover?: string
  sort_order?: number
  status?: string
}) {
  return http.post<IdResponse>('/admin/columns', data)
}

export function updateColumn(
  id: number,
  data: Partial<{
    column_name: string
    column_desc: string
    column_cover: string
    sort_order: number
    status: string
  }>
) {
  return http.put<IdResponse>(`/admin/columns/${id}`, data)
}

export function deleteColumn(id: number) {
  return http.delete<MessageResponse>(`/admin/columns/${id}`)
}

export function getColumnPosts(id: number) {
  return http.get<ColumnPostsData>(`/admin/columns/${id}/posts`)
}

export function addColumnPost(columnId: number, postId: number) {
  return http.post<MessageResponse>(`/admin/columns/${columnId}/posts`, { post_id: postId })
}

export function removeColumnPost(columnId: number, postId: number) {
  return http.delete<MessageResponse>(`/admin/columns/${columnId}/posts/${postId}`)
}

export function updateColumnPostOrder(columnId: number, postIds: number[]) {
  return http.put<MessageResponse>(`/admin/columns/${columnId}/order`, { post_ids: postIds })
}