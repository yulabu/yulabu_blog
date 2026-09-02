import http from '@/utils/http'
import type { UploadResult } from '@/types/api'

export interface UploadOptions {
  files: File[]
  postId?: number
  diaryId?: number
  type?: string
}

export function uploadImages(options: UploadOptions) {
  const formData = new FormData()
  options.files.forEach((file) => formData.append('images', file))
  if (options.postId) {
    formData.append('post_id', String(options.postId))
  }
  if (options.diaryId) {
    formData.append('diary_id', String(options.diaryId))
  }
  formData.append('type', options.type || 'post_content')

  return http.post<UploadResult>('/images/upload', formData)
}