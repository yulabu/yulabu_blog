import http from '@/utils/http'

export function getPublicDiaries(page = 1, pageSize = 20) {
  return http.get('/diaries', { params: { page, pageSize } })
}
