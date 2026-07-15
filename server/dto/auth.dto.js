const AppError = require('../middleware/AppError');

function loginDTO(body) {
  const admin_name = (body.admin_name || '').trim();
  const admin_password = body.admin_password || '';

  if (!admin_name) throw new AppError(400, '用户名不能为空');
  if (!admin_password) throw new AppError(400, '密码不能为空');

  return { admin_name, admin_password };
}

module.exports = { loginDTO };