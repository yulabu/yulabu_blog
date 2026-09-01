export function formatDate(date: Date | string | number): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatDateTimeFull(date: Date | string | number): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function formatShortDateTime(date: Date | string | number): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
