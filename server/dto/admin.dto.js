const AppError = require('@errors/AppError');
const { parseId } = require('./common.dto');

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

// 更新管理员资料：返回值把「资料字段」与「改密」分开。
// 带 new_password 时顺带跑 changePasswordDTO（校验 old 非空、new ≥8 位、新旧不同），
// 于是控制器不必再直读 req.body 判断分支——改密规则的唯一入口仍是 changePasswordDTO
function updateAdminDTO(body) {
  const admin_name = body.admin_name !== undefined
    ? validateAdminName(body.admin_name)
    : undefined;
  const admin_avatar = body.admin_avatar !== undefined
    ? ((body.admin_avatar || '').trim() || null)
    : undefined;

  return {
    fields: { admin_name, admin_avatar },
    passwordChange: body.new_password ? changePasswordDTO(body) : null
  };
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

function adminIdDTO(params) {
  return parseId(params, '管理员');
}

module.exports = {
  createAdminDTO,
  adminIdDTO,
  updateAdminDTO,
  changePasswordDTO
};
