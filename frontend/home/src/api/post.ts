import { apiGet, apiPost, apiTryDetail, type ApiResult } from './client'

/** 分类引用（后端 tag 即分类：vo/post.vo.js 的 category 取自 tag 表，DTO 收 category_id） */
export interface CategoryRef {
  id: number
  name: string
}

export interface ColumnRef {
  id: number
  name: string
}

interface PostBase {
  id: number
  title: string
  summary: string | null
  author: string
  category: CategoryRef | null
  column: ColumnRef | null
  cover: string | null
  status: string
  viewCount: number
  createdAt: string
  updatedAt: string
}

/**
 * 列表项：GET /posts、/posts/archive、专栏目录（后端 vo/post.vo.js 的 postSummary）。
 * 比详情多 coverThumb（400px 缩略图，列表**小卡**封面用，取不到时回退 cover），少 content。
 */
export interface PostSummary extends PostBase {
  coverThumb: string | null
}

/** 详情：GET /posts/:id（vo/post.vo.js 的 postDetail） */
export interface PostDetail extends PostBase {
  content: string
}

export interface PaginatedPosts {
  posts: PostSummary[]
  total: number
  page: number
  totalPages: number
}

export interface ArchiveMonth {
  month: number
  count: number
  posts: PostSummary[]
}

export interface ArchiveYear {
  year: number
  count: number
  months: ArchiveMonth[]
}

/** 上下篇（vo/column.vo.js 的 prevNextVO）：没有时 post 为 null */
export interface PrevNextPost {
  post: { id: number; title: string; cover: string | null } | null
}

/**
 * 列表页每页条数。**唯一出处**：首页 frontmatter 的烘焙与 PostList 的客户端对账都用它，
 * 改前是两处各写一个 8 + 一句「必须一致」的注释（不一致 → 指纹永不相等 → 每次访问无谓重绘）
 */
export const POSTS_PAGE_SIZE = 8

/**
 * 文章列表。**构建期烘焙与客户端对账必须走同一个函数**：参数切片不一致会让
 * 「烘焙的数据」与「对账的数据」变成两个列表，指纹永不相等 → 每次访问无谓重绘。
 */
export function getPosts(page = 1, limit = POSTS_PAGE_SIZE, categoryId?: number, q?: string) {
  return apiGet<PaginatedPosts>('/posts', { page, limit, category_id: categoryId, q })
}

export function getPost(id: number) {
  return apiGet<PostDetail>(`/posts/${id}`)
}

/** SSR 详情页用：404 与其它失败要分流，策略见 client.ts 的 apiTryDetail */
export function tryGetPost(id: number): Promise<ApiResult<PostDetail>> {
  return apiTryDetail<PostDetail>(`/posts/${id}`)
}

export function getArchive() {
  return apiGet<{ archives: ArchiveYear[] }>('/posts/archive')
}

export function getPrevPost(id: number) {
  return apiGet<PrevNextPost>(`/posts/${id}/prev`)
}

export function getNextPost(id: number) {
  return apiGet<PrevNextPost>(`/posts/${id}/next`)
}

/** 记录文章访问（fire & forget，静默失败不影响浏览） */
export function recordPostView(id: number) {
  return apiPost<{ message: string }>('/visits', {
    post_id: id,
    page_path: `/post/${id}`,
  })
}
