import http from '@/utils/http'
import type { FriendLink } from '@/types/api'

export function getFriendLinks() {
  return http.get<FriendLink[]>('/friendlinks')
}
