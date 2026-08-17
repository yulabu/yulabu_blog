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

export interface PostForm {
  title: string
  content: string
  summary: string
  author: string
  categoryId: number | null
}

export interface Notice {
  notice_id: number
  notice_title: string
  notice_content: string
  notice_status: 'show' | 'hide'
  notice_is_pinned: boolean
  notice_created_at: string
}

export interface NoticeForm {
  title: string
  content: string
  status: 'show' | 'hide'
  isPinned: boolean
}

export interface Tag {
  id: number
  name: string
  count: number
}

export interface Admin {
  id: number
  name: string
  avatar: string | null
  created_at: string
  updated_at: string
}

export interface AdminForm {
  name: string
  avatar?: string
  password?: string
  oldPassword?: string
  newPassword?: string
}

export interface LoginForm {
  admin_name: string
  admin_password: string
}

export interface LoginResult {
  token: string
  admin: Admin
}

export interface DashboardStats {
  todayCount: number
  totalCount: number
  publishedCount: number
  trashCount: number
  recentPosts: Post[]
}

export interface PaginatedAdmins {
  admins: Admin[]
  total: number
  page: number
  totalPages: number
}

export interface MessageResponse {
  message: string
}

export interface IdResponse {
  id: number
  message: string
}

export interface UploadResult {
  urls: string[]
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
  created_at: string
  updated_at: string
}

export interface Moment {
  id: number
  content: string
  image: string | null
  status: 'show' | 'hide'
  created_at: string
  updated_at: string
}

export interface PaginatedMoments {
  moments: Moment[]
  total: number
  page: number
  totalPages: number
}
