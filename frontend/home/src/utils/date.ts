export function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatDate(date: string): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDateTime(date: string): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return `${formatDate(date)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
