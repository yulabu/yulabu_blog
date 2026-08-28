import http from '@/utils/http'
import type { PaginatedPosts, Post, PostForm, IdResponse } from '@/types/api'

export function getPosts(page = 1, limit = 10, categoryId?: number, q?: string) {
  return http.get<PaginatedPosts>('/posts', {
    params: { page, limit, category_id: categoryId, q }
  })
}

export function getPost(id: number) {
  return http.get<Post>(`/posts/${id}`)
}

// 后台文章列表（三态：published / trash / draft，按 status 筛选）
export function getAdminPosts(page = 1, limit = 10, status?: string, q?: string) {
  return http.get<PaginatedPosts>('/admin/posts', {
    params: { page, limit, status, q }
  })
}

// 后台文章详情（不过滤状态，草稿/回收站可编辑）
export function getAdminPost(id: number) {
  return http.get<Post>(`/admin/posts/${id}`)
}

// 建草稿（ensureDraft 用，后端强制 draft 状态）
export function createPost(form: PostForm) {
  return http.post<IdResponse>('/posts', {
    post_title: form.title,
    post_content: form.content,
    post_summary: form.summary || null,
    post_author: form.author || '匿名',
    post_category_id: form.categoryId,
    post_cover: form.cover?.trim() || null,
    post_status: 'draft'
  })
}

export function updatePost(id: number, form: PostForm, status?: string) {
  return http.put<IdResponse>(`/posts/${id}`, {
    post_title: form.title,
    post_content: form.content,
    post_summary: form.summary || null,
    post_author: form.author || '匿名',
    post_category_id: form.categoryId,
    post_cover: form.cover?.trim() || null,
    post_status: status
  })
}

export function unbindImages(id: number) {
  return http.put<{ message: string }>(`/posts/${id}/unbind-images`)
}

export function deletePost(id: number) {
  return http.delete<{ message: string }>(`/posts/${id}`)
}

export function restorePost(id: number) {
  return http.put<{ message: string }>(`/admin/posts/${id}/restore`)
}

export function forceDeletePost(id: number) {
  return http.delete<{ message: string }>(`/admin/posts/${id}/force`)
}