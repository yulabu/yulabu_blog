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
  column: ColumnRef | null
  cover: string | null
  status: 'published' | 'trash' | 'draft'
  createdAt: string
  updatedAt: string
}

export interface ColumnRef {
  id: number
  name: string
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
  cover: string | null
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

export interface DashboardChartData {
  postsByDate: { date: string; count: number }[]
  visitsByDate: { date: string; pv: number; uv: number }[]
  tagsDistribution: { name: string; value: number }[]
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

export interface UploadedImage {
  image_id: number
  url: string
  thumb_url: string
}

export interface UploadResult {
  images: UploadedImage[]
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

export interface ColumnItem {
  id: number
  name: string
  desc: string | null
  cover: string | null
  sort_order: number
  status: 'show' | 'hide'
  post_count: number
  created_at: string
  updated_at: string
}

export interface ColumnPostItem {
  id: number
  title: string
  summary: string | null
  category: Category | null
  createdAt: string
  sort: number
}

export interface ColumnCandidate {
  id: number
  title: string
  category: Category | null
}

export interface ColumnPostsData {
  column: ColumnItem
  posts: ColumnPostItem[]
  candidates: ColumnCandidate[]
}

export interface VisitLog {
  id: number
  postId: number | null
  postTitle: string | null
  ip: string
  userAgent: string | null
  referrer: string | null
  path: string
  createdAt: string
}

export interface PaginatedVisitLogs {
  visits: VisitLog[]
  total: number
  page: number
  totalPages: number
}

export interface VisitStats {
  todayPV: number
  todayUV: number
  totalPV: number
  totalUV: number
}
