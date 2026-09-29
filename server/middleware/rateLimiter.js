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

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: MESSAGE,
  handler: makeHandler('login')
})

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: MESSAGE,
  handler: makeHandler('public')
})

const staticLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: MESSAGE,
  handler: makeHandler('static')
})

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: MESSAGE,
  handler: makeHandler('admin')
})

module.exports = { loginLimiter, publicLimiter, staticLimiter, adminLimiter }
