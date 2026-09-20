export function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// 统一按北京时间（UTC+8）取日期部件：SSR 服务器时区（生产为 UTC）与访客本地时区
// 不同，会让同一篇文章的日期文本两侧不一致（水合 mismatch + 显示歧义）。
// 博客面向国内读者，全部日期固定按 +8 计算。
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

export function beijingShifted(date: string | number | Date): Date {
  return new Date(new Date(date).getTime() + BEIJING_OFFSET_MS)
}

export function formatDate(date: string): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  const shifted = beijingShifted(d)
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
}

// 时分（北京时间）。手机端文章卡与日期分开渲染：窄屏才显示（`.date-time` 默认隐藏），
// 桌面端日期文案保持纯日期不变，所以不能直接换成 formatDateTime
export function formatTime(date: string): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const shifted = beijingShifted(d)
  return `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
}

export function formatDateTime(date: string): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return `${formatDate(date)} ${formatTime(date)}`
}
