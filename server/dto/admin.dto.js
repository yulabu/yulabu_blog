const AppError = require('@middleware/AppError');

function validateAdminName(admin_name) {
  const name = (admin_name || '').trim();
  if (!name) throw new AppError(400, '用户名不能为空');
  if (name.length < 6) throw new AppError(400, '用户名至少需要 6 位');
  return name;
}

function validatePassword(admin_password, required = true) {
  const password = admin_password || '';
  if (required && !password) throw new AppError(400, '密码不能为空');
  if (password && password.length < 8) throw new AppError(400, '密码至少需要 8 位');
  return password;
}

function createAdminDTO(body) {
  const admin_name = validateAdminName(body.admin_name);
  const admin_password = validatePassword(body.admin_password, true);
  const admin_avatar = (body.admin_avatar || '').trim() || null;

  return { admin_name, admin_password, admin_avatar };
}

function updateAdminDTO(body) {
  const admin_name = body.admin_name !== undefined
    ? validateAdminName(body.admin_name)
    : undefined;
  const admin_avatar = body.admin_avatar !== undefined
    ? ((body.admin_avatar || '').trim() || null)
    : undefined;

  return { admin_name, admin_avatar };
}

function changePasswordDTO(body) {
  const old_password = body.old_password || '';
  const new_password = validatePassword(body.new_password, true);

  if (!old_password) throw new AppError(400, '旧密码不能为空');
  if (old_password === new_password) {
    throw new AppError(400, '新密码不能与旧密码相同');
  }

  return { old_password, new_password };
}

module.exports = {
  createAdminDTO,
  updateAdminDTO,
  changePasswordDTO
};
