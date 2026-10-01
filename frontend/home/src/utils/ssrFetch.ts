// SSR 详情页（文章 / 专栏）服务端取数的唯一出处：API_BASE、请求、失败分类与重试策略都只在这里。
//
// 为什么抽出来（2026-10）：改前 post/[id].astro 与 columns/[id].astro 各自抄了一份**逐字符相同**的
// fetchJson 与重试块，同一个止血策略（404 才降级、429/5xx/网络错重试一次仍失败则抛错）在
// 两个 .astro 里是两份独立实现；而且对象字面量把 ok 拓宽成 boolean、`.catch()` 的字面量又是第三个
// 非判别成员，判别联合不成立 → `npm run check`（astro check）报 6 个 error。现在策略一处、类型一处。
//
// 契约：本模块只回答「取数结果怎么分类」，不承担响应体类型（那是 src/types/api.ts 的事，data 为 any）
const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:3000/api'

// 判别联合：ok 是字面量 true / false，调用方在 `if (res.ok)` 里能收窄出 data、else 里收窄出 status
export type ApiResult = { ok: true; data: any } | { ok: false; status: number }

// 网络层异常（连接被拒 / DNS / 超时）统一记 status 0：调用方据此走「非 404 → 重试」分支
const networkError = (): ApiResult => ({ ok: false, status: 0 })

export async function fetchJson(path: string): Promise<ApiResult> {
  const res = await fetch(`${API_BASE}${path}`)
  return res.ok ? { ok: true, data: await res.json() } : { ok: false, status: res.status }
}

// 详情取数 + 失败降级（2026-10 止血后的语义，唯一实现）：
//   404            → 原样返回（调用方 rewrite('/404')）
//   429/5xx/网络错 → 立即重试一次；仍失败也原样返回（调用方 throw → Astro 返回 5xx，可重试语义）
// 改前一律降级成 404：后端限流（SSR 回源曾与访客共用限流桶）或短暂故障时，真实文章会对外
// 谎称「不存在」，对读者与搜索引擎都是错的
export async function fetchDetail(path: string): Promise<ApiResult> {
  let attempt = await fetchJson(path).catch(networkError)
  if (!attempt.ok && attempt.status !== 404) {
    attempt = await fetchJson(path).catch(networkError) // 立即重试一次
  }
  return attempt
}
