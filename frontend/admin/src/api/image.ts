import http from '@/utils/http'
import type { UploadResult } from '@/types/api'

// 单张图片大小上限，与后端 server/middleware/imageUpload.js 的 UPLOAD_MAX_SIZE（默认 5MB）保持一致
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024

// 单次请求的张数与字节上限：刻意远小于后端（50 张 / 20MB）与 nginx（client_max_body_size 10m），
// 这样"一次粘贴很多张 / 导入 Markdown 附图片"也能传完——批次越大越容易撞 nginx 的请求体上限和请求超时
const CHUNK_MAX_FILES = 10
const CHUNK_MAX_BYTES = 8 * 1024 * 1024
// 上传是大文件长请求，http.ts 默认 15s 会掐断批量上传（同 api/backup.ts 的处理）
const UPLOAD_TIMEOUT_MS = 120000

export interface UploadOptions {
  files: File[]
  // 仅在需要分成多片时回调（单片上传不打扰）
  onProgress?: (uploaded: number, total: number) => void
}

// 按张数与字节双条件切分；单个超大文件独占一片（继续切开会破坏文件）
function chunkFiles(files: File[]): File[][] {
  const chunks: File[][] = []
  let current: File[] = []
  let bytes = 0

  for (const file of files) {
    if (current.length > 0 && (current.length >= CHUNK_MAX_FILES || bytes + file.size > CHUNK_MAX_BYTES)) {
      chunks.push(current)
      current = []
      bytes = 0
    }
    current.push(file)
    bytes += file.size
  }
  if (current.length > 0) chunks.push(current)

  return chunks
}

// 请求体只有文件本身：图片的归属与类型由「引用它的业务对象」决定（保存文章/专栏/日记时按 URL 派生
// image_id），后端也不读 post_id / diary_id / type 之类的定位或类型参数——那些是旧「按文章目录存放」
// 设计的残留，已随 2026-09 图片重构一并移除
function buildFormData(files: File[]) {
  const formData = new FormData()
  files.forEach((file) => formData.append('images', file))
  return formData
}

// 分片串行上传：每片单独一个请求，按提交顺序拼接结果（后端也是按提交顺序返回的），
// 调用方拿到的 images 顺序与原 files 一一对应
export async function uploadImages(options: UploadOptions): Promise<UploadResult> {
  const { files, onProgress } = options
  const chunks = chunkFiles(files)
  const reportProgress = chunks.length > 1 ? onProgress : undefined

  const images: UploadResult['images'] = []
  let uploaded = 0

  for (const chunk of chunks) {
    const result = await http.post<UploadResult>('/images/upload', buildFormData(chunk), {
      timeout: UPLOAD_TIMEOUT_MS
    })
    images.push(...result.images)
    uploaded += chunk.length
    reportProgress?.(uploaded, files.length)
  }

  return { images }
}
