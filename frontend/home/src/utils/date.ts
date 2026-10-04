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

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function beijingParts(date: string) {
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  return beijingShifted(d)
}

/** 2026.09.02 —— 书脊、封面卡信息带用的紧凑绝对日期 */
export function formatDateDot(date: string): string {
  const s = beijingParts(date)
  if (!s) return '-'
  return `${s.getUTCFullYear()}.${pad(s.getUTCMonth() + 1)}.${pad(s.getUTCDate())}`
}

/** 2026年9月2日 —— 日记本页眉用的长日期（月/日不补零） */
export function formatDateLong(date: string): string {
  const s = beijingParts(date)
  if (!s) return '-'
  return `${s.getUTCFullYear()}年${s.getUTCMonth() + 1}月${s.getUTCDate()}日`
}

/** 9月25日 —— 书脊底部竖排日期与封面日期（北京月/日，不补零无年份） */
export function formatDateMD(date: string): string {
  const s = beijingParts(date)
  if (!s) return '-'
  return `${s.getUTCMonth() + 1}月${s.getUTCDate()}日`
}

/** 周三 */
export function formatWeekday(date: string): string {
  const s = beijingParts(date)
  if (!s) return ''
  return WEEKDAYS[s.getUTCDay()]
}

/** 归档日期徽章的两段文本：{ day: '05', month: 9 }（北京时间；无效日期返回占位） */
export function formatDayMonth(date: string): { day: string; month: number | null } {
  const s = beijingParts(date)
  if (!s) return { day: '--', month: null }
  return { day: pad(s.getUTCDate()), month: s.getUTCMonth() + 1 }
}

// 相对时间（刚刚 / N 天前）只允许在纯客户端场景使用：它的文本随时间变化，放进
// 预渲染页会在构建期就烘焙成一句到访客打开时早已过期的话，而且服务端与客户端必然
// 算出不同文本 → 水合不一致。日记书架与本子一律用上面的绝对日期。
export function formatRelativeTime(date: string): string {
  const s = beijingParts(date)
  if (!s) return '-'
  const diff = Date.now() - new Date(date).getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day

  if (diff < minute) return '刚刚'
  if (diff < hour) return Math.floor(diff / minute) + ' 分钟前'
  if (diff < day) return Math.floor(diff / hour) + ' 小时前'
  if (diff < month) return Math.floor(diff / day) + ' 天前'
  if (diff < 12 * month) return Math.floor(diff / month) + ' 个月前'
  return Math.floor(diff / (365 * day)) + ' 年前'
}
