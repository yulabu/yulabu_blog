/**
 * 后端 API 的唯一传输层 —— 构建期 / SSR / 浏览器三处共用同一实现。
 *
 * 改前是三条并行链路（utils/http.ts 的 axios 给浏览器、utils/serverData.ts 给构建期、
 * utils/ssrFetch.ts 给 SSR），各自一份 API_BASE 表达式与错误策略。现在只有这里认识
 * URL 前缀、超时与错误形状，业务侧只用下面四个出入口：
 *
 *   apiGet / apiPost   失败抛 ApiError      —— 「失败就是错误」的调用方用（详情页、写接口）
 *   apiTry            失败返回判别联合      —— 需要区分状态码的调用方用（404 分流）
 *   apiSoft           失败返回 null + 一行告警 —— 允许降级的调用方用（构建期/SSR 列表取数）
 *
 * 约定：
 *   · URL 与查询参数只在 api/*.ts 里拼，别处不许出现 '/api' 或裸 fetch（护栏断言③）
 *   · 浏览器侧走相对路径 '/api'（dev 由 vite 代理、生产由 nginx 反代）；
 *     服务端侧走 API_BASE_URL（pm2 注入）默认本机 3000 —— 与 nginx/PM2 既有部署一致
 *   · 服务端超时压得短（4s）：fail-soft 的前提是快速失败，别让构建/SSR 卡在坏后端上
 */

/** 请求失败的统一形状：status 0 表示网络层异常（连接被拒 / DNS / 超时），与改前 ssrFetch 的约定一致 */
export class ApiError extends Error {
  readonly status: number
  readonly method: string
  readonly path: string

  constructor(status: number, message: string, method = 'GET', path = '') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.method = method
    this.path = path
  }

  /** 告警/文案用的可读描述 */
  get reason(): string {
    return this.status === 0 ? '网络异常' : `HTTP ${this.status}`
  }
}

/** 判别联合：调用方在 if (res.ok) 里收窄出 data，else 里收窄出 status */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number }

export type Query = Record<string, string | number | boolean | null | undefined>

const DEFAULT_SERVER_BASE = 'http://127.0.0.1:3000/api'
const TIMEOUT_SERVER_MS = 4000
const TIMEOUT_BROWSER_MS = 15000

function baseUrl(): string {
  if (import.meta.env.SSR) {
    // 只在 Node 侧求值；浏览器包里 import.meta.env.SSR 是 false，这段会被摇掉
    const fromEnv = typeof process !== 'undefined' ? process.env?.API_BASE_URL : undefined
    return fromEnv || DEFAULT_SERVER_BASE
  }
  return import.meta.env.VITE_API_BASE_URL || '/api'
}

/** 拼查询串：null / undefined / 空串一律不发（改前 axios 也跳过 undefined 参数） */
function buildQuery(params?: Query): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

/** 后端错误体是 { message }（errors/contract.js 的统一形状）；非 JSON（如 nginx 502 页）走兜底文案 */
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string }
    if (body && typeof body.message === 'string' && body.message) return body.message
  } catch {
    /* 交给下面的兜底 */
  }
  return `请求失败（HTTP ${res.status}）`
}

async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  options: { params?: Query; body?: unknown } = {},
): Promise<T> {
  const timeout = import.meta.env.SSR ? TIMEOUT_SERVER_MS : TIMEOUT_BROWSER_MS
  const init: RequestInit = {
    method,
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(timeout),
  }
  if (options.body !== undefined) {
    init.headers = { ...init.headers, 'content-type': 'application/json' }
    init.body = JSON.stringify(options.body)
  }

  let res: Response
  try {
    res = await fetch(`${baseUrl()}${path}${buildQuery(options.params)}`, init)
  } catch (err) {
    // 连接被拒 / DNS / 超时（含 AbortSignal 触发）
    throw new ApiError(0, '网络异常，请稍后重试', method, path)
  }

  if (!res.ok) throw new ApiError(res.status, await errorMessage(res), method, path)
  return (await res.json()) as T
}

/** GET，失败抛 ApiError */
export function apiGet<T>(path: string, params?: Query): Promise<T> {
  return request<T>('GET', path, { params })
}

/** POST，失败抛 ApiError */
export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, { body })
}

/** GET，失败返回 { ok: false, status }（不抛）—— 只有要分流状态码的地方用 */
export async function apiTry<T>(path: string, params?: Query): Promise<ApiResult<T>> {
  try {
    return { ok: true, data: await request<T>('GET', path, { params }) }
  } catch (err) {
    return { ok: false, status: err instanceof ApiError ? err.status : 0 }
  }
}

/**
 * 详情页的取数策略（唯一实现，文章页与专栏页共用 —— 改前在两个 .astro 里各抄了一份）：
 *   404            → 原样返回（调用方 rewrite('/404')）
 *   429/5xx/网络错 → 立即重试一次；仍失败也原样返回（调用方 throw → Astro 返回 5xx，可重试语义）
 * 不降级成 404 是刻意的：后端限流或短暂故障时，真实内容不该对外谎称「不存在」。
 */
export async function apiTryDetail<T>(path: string): Promise<ApiResult<T>> {
  let attempt = await apiTry<T>(path)
  if (!attempt.ok && attempt.status !== 404) {
    attempt = await apiTry<T>(path)
  }
  return attempt
}

/**
 * 取数降级：失败记一行告警并返回 null，绝不抛 —— 构建期预渲染与 SSR 列表页用它，
 * 后端不可达时页面退化为客户端取数（与改前 serverData 的 fail-soft 语义一致）。
 */
export async function apiSoft<T>(pending: Promise<T>): Promise<T | null> {
  try {
    return await pending
  } catch (err) {
    if (err instanceof ApiError) {
      console.warn(`[api] ${err.method} ${err.path} 取数失败（${err.reason}），该页已降级`)
    } else {
      console.warn('[api] 取数失败，该页已降级', err)
    }
    return null
  }
}
