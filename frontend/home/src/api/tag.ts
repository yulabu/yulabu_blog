import { apiGet } from './client'

/** 分类（后端 tag 表；count 是分类下已发布文章数） */
export interface Tag {
  id: number
  name: string
  count: number
}

// 同一页存在两个 TagBox 实例：PageFrame 的左栏一个、HomeView 里给移动端的一个
// （后者只靠 CSS display:none 隐藏，组件照样挂载并触发自己的同步），各调一次
// getTags 会让首页打两次 GET /tags。模块级短时缓存让它们共用同一个请求 ——
// 与 stores/tagFilter.ts 同为「模块单例」模式。TTL 很短，软导航后仍会重新取。
const TAGS_TTL_MS = 2000
let cached: { at: number; promise: Promise<Tag[]> } | null = null

export function getTags(): Promise<Tag[]> {
  const now = Date.now()
  if (cached && now - cached.at < TAGS_TTL_MS) return cached.promise

  const promise = apiGet<Tag[]>('/tags').catch((err) => {
    if (cached?.promise === promise) cached = null
    throw err
  })
  cached = { at: now, promise }
  return promise
}
