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

// 记录文章访问（fire & forget，静默失败不影响浏览）
export function recordPostView(id: number) {
  return http.post<{ message: string }>('/visits', {
    post_id: id,
    page_path: `/post/${id}`
  })
}
