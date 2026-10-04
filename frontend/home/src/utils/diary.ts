import type { Diary } from '@/api/diary'
import { beijingShifted } from '@/utils/date'

// 日记的展示派生。后端 diary 表只有 content / images / created_at 三个业务字段，
// 标题是正文首行（沿用旧日记页的约定），没有 title / summary 列。

/** 正文首行 = 标题 */
export function diaryTitle(diary: Diary): string {
  const first = (diary.content || '').split('\n')[0].trim()
  return first || '无题'
}

/** 正文其余部分（保留作者自己的换行） */
export function diaryBody(diary: Diary): string {
  return (diary.content || '').split('\n').slice(1).join('\n').trim()
}

/** 压成一行的摘要，给封面卡的信息带用 */
export function diaryExcerpt(diary: Diary, max = 44): string {
  const body = diaryBody(diary).replace(/\s+/g, ' ').trim()
  if (!body) return ''
  return body.length > max ? body.slice(0, max) + '…' : body
}

/** 书脊 / 封面卡用图：优先 400px 缩略图，外链封面与老数据回退原图 */
export function diaryCover(diary: Diary): string {
  return diary.coverThumb || (diary.images && diary.images[0]) || ''
}

// —— 下面这些「每本书长得不一样」的派生值必须是 id 的纯函数 ——
// 书架在构建期预渲染、客户端再水合：掺进 Math.random() 会让 SSR 与客户端算出不同
// 结果，触发水合不一致（本项目实测过高危形态）。所以统一走一个确定性哈希。
function diarySeed(id: number, salt = 0): number {
  const n = (Number(id) || 0) + salt * 7919
  let h = 2166136261 ^ n
  h = Math.imul(h ^ (h >>> 13), 16777619)
  h ^= h >>> 16
  return Math.abs(h % 10000) / 10000
}

/** 书脊布面的季节档位（0 春 / 1 夏 / 2 秋 / 3 冬），按日记的北京月份划分。
 *  布面色是令牌 --book-cloth-1..4（随主题换值）；返回值直接当下标用 */
export function diaryQuarter(date: string): number {
  const d = new Date(date)
  if (isNaN(d.getTime())) return 0
  const month = beijingShifted(d).getUTCMonth() + 1
  return Math.min(3, Math.floor((month - 1) / 3))
}

/** 日记本里那张「贴上去的照片」的倾斜角（-1.6° ~ 1.6°），纯装饰 */
export function diaryPhotoTilt(id: number): number {
  return (diarySeed(id, 3) - 0.5) * 3.2
}

/** 每本书的高度系数（0.87 ~ 1）：真实书架上不会本本一样高，纯视觉，确定性 */
export function diaryHeightScale(id: number): number {
  return 0.87 + diarySeed(id, 5) * 0.13
}
