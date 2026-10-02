import { apiGet } from './client'

/** 日记：后端没有标题/摘要字段，正文首行在前端充当标题（见 utils/diary.ts） */
export interface Diary {
  id: number
  content: string
  images: string[]
  /** 400px 封面缩略图（书脊纹理与抽出的封面卡用）；外链封面/老数据为 null，回退 images[0] */
  coverThumb: string | null
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
