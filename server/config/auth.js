const env = require('./env')

// JWT 的唯一出处：签发（controllers/authController.js）与验签（middleware/auth.js）共用同一份配置。
// 改前两处各读一次 process.env.JWT_SECRET，而有效期 '7d' 只写在签发处——验签侧只能靠注释记住它；
// 现在密钥为必填（env.js 的 required），缺失即启动失败。
module.exports = {
  secret: env.jwt.secret,
  expiresIn: env.jwt.expiresIn
}
