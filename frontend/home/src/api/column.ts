import { apiGet, apiTryDetail, type ApiResult } from './client'
import type { CategoryRef } from './post'

export interface ColumnItem {
  id: number
  name: string
  desc: string | null
  cover: string | null
  sort_order: number
  status: 'show' | 'hide'
  post_count: number
}

/** 专栏目录条目（vo/column.vo.js 的 columnPostItem）：cover 必须带上，过渡卡片靠它取封面 */
export interface ColumnPostItem {
  id: number
  title: string
  summary: string | null
  cover: string | null
  category: CategoryRef | null
  createdAt: string
  sort: number
}

export interface ColumnDetail extends ColumnItem {
  posts: ColumnPostItem[]
}

export function getColumns() {
  return apiGet<ColumnItem[]>('/columns')
}

export function getColumnDetail(id: number) {
  return apiGet<ColumnDetail>(`/columns/${id}`)
}

/** SSR 详情页用：404 与其它失败要分流，策略见 client.ts 的 apiTryDetail */
export function tryGetColumnDetail(id: number): Promise<ApiResult<ColumnDetail>> {
  return apiTryDetail<ColumnDetail>(`/columns/${id}`)
}
