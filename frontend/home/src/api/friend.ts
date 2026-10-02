import { apiGet } from './client'

/** 友链（图片全部外链：avatar / preview_image 只存 http(s) 或 // 开头的地址） */
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

export function getFriendLinks() {
  return apiGet<FriendLink[]>('/friendlinks')
}
