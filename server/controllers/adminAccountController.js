const bcrypt = require('bcrypt');
const AppError = require('@middleware/AppError');
const { parseId } = require('@dto/common.dto');
const { Admin } = require('@models');
const { createAdminDTO, updateAdminDTO, changePasswordDTO } = require('@dto/admin.dto');
const { adminProfile, adminListItem } = require('@vo/admin.vo');

// GET /api/admin/admins
exports.getAdminList = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
  const offset = (page - 1) * limit;

  const { rows: admins, count: total } = await Admin.findAndCountAll({
    attributes: { exclude: ['admin_password'] },
    order: [['created_at', 'DESC']],
    limit,
    offset
  });

  res.json({
    admins: admins.map(adminListItem),
    total,
    page,
    totalPages: Math.ceil(total / limit)
  });
};

// GET /api/admin/admins/me
exports.getCurrentAdmin = async (req, res) => {
  const admin = await Admin.findByPk(req.admin.admin_id, {
    attributes: { exclude: ['admin_password'] }
  });

  if (!admin) throw new AppError(404, '管理员不存在');

  res.json(adminProfile(admin));
};

// POST /api/admin/admins
exports.createAdmin = async (req, res) => {
  const { admin_name, admin_password, admin_avatar } = createAdminDTO(req.body);

  const exists = await Admin.findOne({ where: { admin_name } });
  if (exists) throw new AppError(409, '用户名已存在');

  const hash = await bcrypt.hash(admin_password, 10);

  const admin = await Admin.create({
    admin_name,
    admin_password: hash,
    admin_avatar
  });

  res.status(201).json(adminProfile(admin));
};

// PUT /api/admin/admins/:id
exports.updateAdmin = async (req, res) => {
  const adminId = parseId(req.params, '管理员');

  const admin = await Admin.findByPk(adminId);
  if (!admin) throw new AppError(404, '管理员不存在');

  // 修改基础资料
  const updates = updateAdminDTO(req.body);
  const changedFields = {};

  if (updates.admin_name !== undefined) {
    if (updates.admin_name !== admin.admin_name) {
      const exists = await Admin.findOne({ where: { admin_name: updates.admin_name } });
      if (exists) throw new AppError(409, '用户名已存在');
    }
    changedFields.admin_name = updates.admin_name;
  }

  if (updates.admin_avatar !== undefined) {
    changedFields.admin_avatar = updates.admin_avatar;
  }

  // 修改密码：只能改自己的密码，且必须提供旧密码
  if (req.body.new_password) {
    if (adminId !== req.admin.admin_id) {
      throw new AppError(403, '只能修改自己的密码');
    }
    const { old_password, new_password } = changePasswordDTO(req.body);
    const valid = await bcrypt.compare(old_password, admin.admin_password);
    if (!valid) throw new AppError(400, '旧密码错误');

    changedFields.admin_password = await bcrypt.hash(new_password, 10);
  }

  if (Object.keys(changedFields).length === 0) {
    return res.json(adminProfile(admin));
  }

  await admin.update(changedFields);

  // 重新查询，排除密码
  const updated = await Admin.findByPk(adminId, {
    attributes: { exclude: ['admin_password'] }
  });

  res.json(adminProfile(updated));
};

// DELETE /api/admin/admins/:id
exports.deleteAdmin = async (req, res) => {
  const adminId = parseId(req.params, '管理员');

  const admin = await Admin.findByPk(adminId);
  if (!admin) throw new AppError(404, '管理员不存在');

  if (adminId === req.admin.admin_id) {
    throw new AppError(403, '不能删除自己');
  }

  const total = await Admin.count();
  if (total <= 1) {
    throw new AppError(403, '至少保留一个管理员账号');
  }

  await admin.destroy();

  res.json({ message: '删除成功' });
};
