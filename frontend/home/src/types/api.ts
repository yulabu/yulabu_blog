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
  status: 'published' | 'trash'
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
  status: 'published' | 'trash'
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

export interface Notice {
  notice_id: number
  notice_title: string
  notice_content: string
  notice_status: 'show' | 'hide'
  notice_is_pinned: boolean
  notice_created_at: string
}

export interface Tag {
  id: number
  name: string
  count: number
}

export interface MessageResponse {
  message: string
}
