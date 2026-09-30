const jwt = require('jsonwebtoken');
const AppError = require('@errors/AppError');
const { secret: jwtSecret } = require('@config/auth');

// 只验签，不查库：token 载荷直接给下游用（adminAccountController 靠 admin_id 判「只能改自己密码」）。
// 取舍：删掉管理员后旧 token 仍有效到过期——有效期与密钥的唯一出处是 config/auth.js（默认 7d），
// 本项目不做实时吊销，规模上不值得为此查库。
// 401 一律 throw（由 errorHandler 统一出响应）：错误出口只有一处，别在这里自己写 JSON
module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(401, '未登录，请先登录');
  }

  const token = header.split(' ')[1];
  try {
    req.admin = jwt.verify(token, jwtSecret);
  } catch (error) {
    throw new AppError(401, 'token 无效或已过期');
  }

  next();
};
