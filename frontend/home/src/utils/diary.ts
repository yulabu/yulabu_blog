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

/** 压成一行的摘要，给照片卡的批注用 */
export function diaryExcerpt(diary: Diary, max = 44): string {
  const body = diaryBody(diary).replace(/\s+/g, ' ').trim()
  if (!body) return ''
  return body.length > max ? body.slice(0, max) + '…' : body
}

/** 照片卡与日记本过渡封面用图：优先 400px 缩略图，外链封面与老数据回退原图 */
export function diaryCover(diary: Diary): string {
  return diary.coverThumb || (diary.images && diary.images[0]) || ''
}

// —— 下面这些「每张卡长得不一样」的派生值必须是 id 的纯函数 ——
// 照片墙在构建期预渲染、客户端再水合：掺进 Math.random() 会让 SSR 与客户端算出不同
// 结果，触发水合不一致（本项目实测过高危形态）。所以统一走一个确定性哈希。
function diarySeed(id: number, salt = 0): number {
  const n = (Number(id) || 0) + salt * 7919
  let h = 2166136261 ^ n
  h = Math.imul(h ^ (h >>> 13), 16777619)
  h ^= h >>> 16
  return Math.abs(h % 10000) / 10000
}

/** 胶带的季节档位（0 春 / 1 夏 / 2 秋 / 3 冬），按日记的北京月份划分。
 *  胶带色是恒定令牌 --gallery-tape-1..4（纸是白天材质，不随主题翻转） */
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

// 照片墙的视觉派生：比例、倾斜、胶带都由 id 纯函数决定，构建期与客户端一致。
// 这不是"随机顺序"——列表顺序仍由接口决定，这些只让每张卡长得不一样。

const PRINT_RATIOS = [
  [4, 5],
  [3, 4],
  [1, 1],
  [4, 3]
] as const

/** 冲印照片的宽高比（4:5 / 3:4 / 1:1 / 4:3 四档之一） */
export function diaryPrintRatio(id: number): { w: number; h: number } {
  const i = Math.floor(diarySeed(id, 11) * PRINT_RATIOS.length)
  return { w: PRINT_RATIOS[i][0], h: PRINT_RATIOS[i][1] }
}

/** 卡片在墙上的轻微倾斜（-0.7° ~ 0.7°） */
export function diaryCardTilt(id: number): number {
  return (diarySeed(id, 7) - 0.5) * 1.4
}

/** 胶带：null = 这张不贴；否则左右与角度。约 70% 的卡有胶带（确定性） */
export function diaryTape(id: number): { side: 'left' | 'right'; angle: number } | null {
  const s = diarySeed(id, 9)
  if (s < 0.3) return null
  return {
    side: s < 0.65 ? 'left' : 'right',
    angle: (diarySeed(id, 13) - 0.5) * 14
  }
}
