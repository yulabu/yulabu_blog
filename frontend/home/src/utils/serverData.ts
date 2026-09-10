/**
 * 构建 / SSR 期服务端取数。
 *
 * 列表页是预渲染的（astro.config: output 'static'），页面 frontmatter 顶层 await
 * 本模块在 **build 阶段** 取数，再经 props 注入岛 —— 产物 HTML 里就是真实内容：
 * 首屏不再先闪「加载中」空壳，LCP 更好，爬虫/分享链接也能直接读到文章。
 *
 * 与 src/utils/http.ts 的区别，两点都必须守：
 *   1. 跑在 Node，没有 window / localStorage / axios 拦截器；
 *   2. **fail-soft**：后端不可达一律返回 null，页面退化为客户端取数，绝不让
 *      `npm run build` 失败（本地没起后端也能构建）。
 *
 * 仅限 .astro frontmatter 与 SSR 使用。Vue 岛请用 src/api/*，并配合
 * src/utils/liveData.ts 做水合后的静默对账。
 */
import type {
  ArchiveYear,
  ColumnItem,
  FriendLink,
  PaginatedDiaries,
  PaginatedPosts,
  Tag,
} from '@/types/api'

// 生产由 pm2 注入 API_BASE_URL；默认走本机后端（与 post/[id].astro 的既有约定一致）
const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:3000/api'
const TIMEOUT_MS = 4000

export async function fetchServer<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) {
      console.warn(`[serverData] ${path} → HTTP ${res.status}，该页将回退为客户端取数`)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.warn(`[serverData] ${path} 取数失败，该页将回退为客户端取数`, err)
    return null
  }
}

/* 查询参数必须与 src/api/* 保持一致，否则「构建期烘焙的数据」与「客户端对账的数据」
 * 会是两个不同的切片，导致每次水合都误判为有变化而无谓地重绘。
 * 注意两个接口命名不统一：/posts 是 limit，/diaries 是 pageSize。 */

export function fetchPosts(page = 1, limit = 8) {
  return fetchServer<PaginatedPosts>(`/posts?page=${page}&limit=${limit}`)
}

export function fetchArchive() {
  return fetchServer<{ archives: ArchiveYear[] }>('/posts/archive')
}

export function fetchColumns() {
  return fetchServer<ColumnItem[]>('/columns')
}

export function fetchTags() {
  return fetchServer<Tag[]>('/tags')
}

export function fetchFriendLinks() {
  return fetchServer<FriendLink[]>('/friendlinks')
}

// 默认 pageSize 必须与 src/api/diary.ts 的 getPublicDiaries 默认值一致（20）
export function fetchDiaries(page = 1, pageSize = 20) {
  return fetchServer<PaginatedDiaries>(`/diaries?page=${page}&pageSize=${pageSize}`)
}
