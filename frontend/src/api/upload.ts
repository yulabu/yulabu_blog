import http from '@/utils/http'
import type { UploadResult } from '@/types/api'

export interface UploadOptions {
  files: File[]
  postId?: number
  tempId?: string
}

export function uploadImages(options: UploadOptions) {
  const formData = new FormData()
  options.files.forEach((file) => formData.append('images', file))

  if (options.postId) {
    formData.append('post_id', String(options.postId))
  }
  if (options.tempId) {
    formData.append('temp_id', options.tempId)
  }

  return http.post<UploadResult>('/upload/batch', formData)
}
