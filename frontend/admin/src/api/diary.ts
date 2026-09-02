import http from '@/utils/http'

export function getDiaries(page = 1, pageSize = 20) {
  return http.get('/admin/diaries', { params: { page, pageSize } })
}

export function getDiary(id: number) {
  return http.get(`/admin/diaries/${id}`)
}

export function createDiary(data: { content: string; images?: string[] }) {
  return http.post('/admin/diaries', data)
}

export function updateDiary(id: number, data: { content?: string; images?: string[] }) {
  return http.put(`/admin/diaries/${id}`, data)
}

export function deleteDiary(id: number) {
  return http.delete(`/admin/diaries/${id}`)
}

export function getPublicDiaries(page = 1, pageSize = 20) {
  return http.get('/diaries', { params: { page, pageSize } })
}
