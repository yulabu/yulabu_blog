import { apiGet } from './client'

/** 日记：后端没有标题/摘要字段，正文首行在前端充当标题（见 utils/diary.ts） */
export interface Diary {
  id: number
  content: string
  images: string[]
  /** 400px 封面缩略图（照片卡与日记本过渡封面用）；外链封面/老数据为 null，回退 images[0] */
  coverThumb: string | null
  /** 封面原图像素（EXIF 旋转后）；只作 img 的 width/height 预留，老图/外链为 null 按图片自身比例撑开 */
  coverWidth: number | null
  coverHeight: number | null
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

/** 分页参数名是 pageSize（不是 /posts 的 limit），改前两处各写一遍导致过切片不一致 */
export const DIARY_PAGE_SIZE = 20

export function getPublicDiaries(page = 1, pageSize = DIARY_PAGE_SIZE) {
  return apiGet<PaginatedDiaries>('/diaries', { page, pageSize })
}
