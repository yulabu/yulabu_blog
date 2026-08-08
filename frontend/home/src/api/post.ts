import http from '@/utils/http'
import type { PaginatedPosts, Post, ArchiveYear } from '@/types/api'

export function getPosts(page = 1, limit = 10, categoryId?: number, q?: string) {
  return http.get<PaginatedPosts>('/posts', {
    params: { page, limit, category_id: categoryId, q }
  })
}

export function getPost(id: number) {
  return http.get<Post>(`/posts/${id}`)
}

export function getArchive() {
  return http.get<{ archives: ArchiveYear[] }>('/posts/archive')
}
