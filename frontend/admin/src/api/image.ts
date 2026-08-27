import http from '@/utils/http'
import type { UploadResult } from '@/types/api'

export interface UploadOptions {
  files: File[]
  postId: number
}

export function uploadImages(options: UploadOptions) {
  const formData = new FormData()
  options.files.forEach((file) => formData.append('images', file))
  formData.append('post_id', String(options.postId))

  return http.post<UploadResult>('/images/upload', formData)
}