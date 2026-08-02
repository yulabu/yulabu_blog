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

export function createPost(form: PostForm, tempId?: string) {
  return http.post<IdResponse>('/posts', {
    post_title: form.title,
    post_content: form.content,
    post_summary: form.summary || null,
    post_author: form.author || '匿名',
    post_category_id: form.categoryId,
    temp_id: tempId
  })
}

export function updatePost(id: number, form: PostForm) {
  return http.put<IdResponse>(`/posts/${id}`, {
    post_title: form.title,
    post_content: form.content,
    post_summary: form.summary || null,
    post_author: form.author || '匿名',
    post_category_id: form.categoryId
  })
}

export function deletePost(id: number) {
  return http.delete<{ message: string }>(`/posts/${id}`)
}
