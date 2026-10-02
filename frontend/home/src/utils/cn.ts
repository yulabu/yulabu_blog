/**
 * 类名拼接（shadcn 约定的 cn 的零依赖版本）。
 * 只做「过滤假值 + 空格连接」——本项目没有 tailwind-merge 的冲突合并需求：
 * 原语的尺寸/间距都走 variant props，调用方只补布局类。
 */
export function cn(...parts: unknown[]): string {
  return parts.filter((p) => typeof p === 'string' && p.trim()).join(' ')
}
