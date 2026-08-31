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

export interface FriendLink {
  id: number
  name: string
  url: string
  avatar: string | null
  description: string | null
  preview_image: string | null
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
  category: Category | null
  createdAt: string
  sort: number
}

export interface ColumnDetail extends ColumnItem {
  posts: ColumnPostItem[]
}

export interface PrevNextPost {
  post: { id: number; title: string } | null
}

export interface MessageResponse {
  message: string
}
