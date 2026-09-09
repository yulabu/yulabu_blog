import http from '@/utils/http'
import type { BackupInfo, BackupListResponse } from '@/types/api'

export function getBackups() {
  return http.get<BackupListResponse>('/admin/backups')
}

export function createBackup() {
  // 备份含整库导出 + 图片镜像同步，可能远超 http 默认 15s 超时，此处关闭超时
  return http.post<{ message: string; backup: BackupInfo }>('/admin/backups', undefined, { timeout: 0 })
}

export function deleteBackup(filename: string) {
  return http.delete<{ message: string }>(`/admin/backups/${filename}`)
}

// 下载完整备份包（数据库 dump + 图片镜像 + 恢复脚本，tar.gz），触发浏览器保存
export async function downloadBackup(filename: string) {
  const blob = await http.get<Blob>(`/admin/backups/${filename}/export`, {
    responseType: 'blob',
    // 打包整站图片耗时可能远超默认超时，此处关闭超时
    timeout: 0
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `blog-backup-${filename.replace(/\.sql\.gz$/, '')}.tar.gz`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
