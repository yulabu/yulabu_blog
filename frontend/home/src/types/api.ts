export interface Category {
  id: number
  name: string
}

export interface Post {
  id: number
  title: string
  content?: string
  summary: string | null
  author: string
  category: Category | null
  cover: string | null
  status: 'published' | 'trash'
  viewCount: number
  createdAt: string
  updatedAt: string
}

export interface PaginatedPosts {
  posts: Post[]
  total: number
  page: number
  totalPages: number
}

export interface ArchivePost {
  id: number
  title: string
  summary: string | null
  author: string
  category: Category | null
  cover: string | null
  status: 'published' | 'trash'
  viewCount: number
  createdAt: string
  updatedAt: string
}

export interface ArchiveMonth {
  month: number
  count: number
  posts: ArchivePost[]
}

export interface ArchiveYear {
  year: number
  count: number
  months: ArchiveMonth[]
}

export interface Tag {
  id: number
  name: string
  count: number
}

/** 日记：后端没有标题/摘要字段，正文首行在前端充当标题 */
export interface Diary {
  id: number
  content: string
  images: string[]
  created_at: string
  updated_at: string
}

export interface PaginatedDiaries {
  diaries: Diary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface FriendLink {
  id: number
  name: string
  url: string
  avatar: string | null
  preview_image: string | null
  description: string | null
  sort_order: number
  status: 'show' | 'hide'
}

export interface ColumnItem {
  id: number
  name: string
  desc: string | null
  cover: string | null
  sort_order: number
  status: 'show' | 'hide'
  post_count: number
}

export interface ColumnPostItem {
  id: number
  title: string
  summary: string | null
  cover: string | null
  category: Category | null
  createdAt: string
  sort: number
}

export interface ColumnDetail extends ColumnItem {
  posts: ColumnPostItem[]
}

export interface PrevNextPost {
  post: { id: number; title: string; cover: string | null } | null
}

export interface MessageResponse {
  message: string
}
