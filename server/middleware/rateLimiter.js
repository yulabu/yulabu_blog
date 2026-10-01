const rateLimit = require('express-rate-limit')
const { errorBody } = require('@errors/contract')
const { warnLine } = require('@utils/log')

// 429 由限流器自己写响应（不经 errorHandler），形状与其它错误同源：errors/contract.js
const MESSAGE = errorBody('请求过于频繁，请稍后重试')

// 命中限流时记一行 warn，并写明是哪个桶——这是应用层唯一的节流/暴破信号：
// 外网扫描器被打成 400 之后（e81e7d0），nginx access log 里只剩状态码，
// 而 PM2 日志里本来一条痕迹都没有。刻意不在每次 4xx 记日志，只在真正触发限流时记
function makeHandler(label) {
  return (req, res, _next, options) => {
    console.warn(warnLine(req, label))
    res.status(options.statusCode).send(options.message)
  }
}

// 四个桶的公共策略只有这一处，差异全在下面的 spec 里。
// overrides 是预留的口子：将来"SSR 回源单独一桶"只需在这里加 skip / 白名单
function makeLimiter({ label, windowMs, max, ...overrides }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: MESSAGE,
    handler: makeHandler(label),
    ...overrides
  })
}

// 本机回环地址判定：blog-web 的 SSR 用 API_BASE_URL=http://127.0.0.1:3000/api 回源，
// 从服务端看 req.ip 恒是回环（IPv4 或 ::ffff: 映射形式）。它一次文章页渲染要打 4 个公开接口
// （详情 + prev + next + settings），与访客共用 60/min 的桶时全站约 15 次/分钟就饱和——
// SSR 收到 429 → 页面降级成 404，**真实文章因此对外谎称不存在**（2026-10 止血）。
// 访客不受影响：他们经 nginx 带 X-Forwarded-For，trust proxy 'loopback' 使其按真实 IP 分桶，
// 与 SSR 从来不是一个桶。放行回环只对本机回源与运维排查生效，不降低对外防护。
function isLoopbackIp(ip) {
  const raw = String(ip || '')
  const norm = raw.startsWith('::ffff:') ? raw.slice(7) : raw
  return norm === '127.0.0.1' || norm === '::1'
}

// 阈值依据（改数值前先读这两条）：
// ① public 60/min 与 static 120/min 是按「单个访客正常浏览一屏要打几个请求」定的上限，
//    不是按站点吞吐定的；public 桶对回环地址 skip（SSR 回源，见上面 isLoopbackIp 的说明）
// ② login 5/15min 是唯一的安全阈值（口令暴破面），放宽前先想清楚
const loginLimiter = makeLimiter({ label: 'login', windowMs: 15 * 60 * 1000, max: 5 })
const publicLimiter = makeLimiter({ label: 'public', windowMs: 60 * 1000, max: 60, skip: (req) => isLoopbackIp(req.ip) })
const staticLimiter = makeLimiter({ label: 'static', windowMs: 60 * 1000, max: 120 })
const adminLimiter = makeLimiter({ label: 'admin', windowMs: 60 * 1000, max: 120 })

module.exports = { loginLimiter, publicLimiter, staticLimiter, adminLimiter, isLoopbackIp }
