// 浏览量格式化：超过 10000 显示为 X.X万
export function formatViewCount(count: number): string {
  if (!count || count <= 0) return '0'
  if (count >= 10000) {
    const w = count / 10000
    // 保留一位小数，去掉多余的 .0
    return (Math.floor(w * 10) / 10).toFixed(1).replace(/\.0$/, '') + ' 万'
  }
  return String(count)
}
