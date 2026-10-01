const AppError = require('@errors/AppError');
const { paginate } = require('@dto/common.dto');
const { Admin } = require('@models');
const { createAdminDTO, adminIdDTO, updateAdminDTO } = require('@dto/admin.dto');
const { adminProfile } = require('@vo/admin.vo');
// 口令哈希与验签的唯一出口（轮数也在那里）
const password = require('@services/auth/password');
// 删除守卫（不能删自己 / 至少保留一个）在 services/admin.js（判据①）
const { deleteAdminWithGuard } = require('@services/admin');

// GET /api/admin/admins
exports.getAdminList = async (req, res) => {
  const { page, limit, offset } = paginate(req.query);

  const { rows: admins, count: total } = await Admin.findAndCountAll({
    attributes: { exclude: ['admin_password'] },
    order: [['created_at', 'DESC']],
    limit,
    offset
  });

  res.json({
    admins: admins.map(adminProfile),
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

  const admin = await Admin.create({
    admin_name,
    admin_password: await password.hash(admin_password),
    admin_avatar
  });

  res.status(201).json({ id: admin.admin_id, message: '创建成功' });
};

// PUT /api/admin/admins/:id
exports.updateAdmin = async (req, res) => {
  const adminId = adminIdDTO(req.params);

  const admin = await Admin.findByPk(adminId);
  if (!admin) throw new AppError(404, '管理员不存在');

  // 资料字段与改密都来自 DTO（控制器不直读 req.body；改密校验在 changePasswordDTO 里）
  const { fields, passwordChange } = updateAdminDTO(req.body);
  const changedFields = {};

  if (fields.admin_name !== undefined) {
    if (fields.admin_name !== admin.admin_name) {
      const exists = await Admin.findOne({ where: { admin_name: fields.admin_name } });
      if (exists) throw new AppError(409, '用户名已存在');
    }
    changedFields.admin_name = fields.admin_name;
  }

  if (fields.admin_avatar !== undefined) {
    changedFields.admin_avatar = fields.admin_avatar;
  }

  // 修改密码：只能改自己的密码，且必须提供旧密码
  if (passwordChange) {
    if (adminId !== req.admin.admin_id) {
      throw new AppError(403, '只能修改自己的密码');
    }
    const valid = await password.verify(passwordChange.old_password, admin.admin_password);
    if (!valid) throw new AppError(400, '旧密码错误');

    changedFields.admin_password = await password.hash(passwordChange.new_password);
  }

  if (Object.keys(changedFields).length > 0) {
    await admin.update(changedFields);
  }

  // 统一写操作契约：{ id, message }（改前这里回完整 adminProfile，前端只在「改自己资料」时用过）
  res.json({ id: adminId, message: '更新成功' });
};

// DELETE /api/admin/admins/:id
// 守卫（不能删自己 / 至少保留一个管理员）在 services/admin.js（判据①：没有 DB 兜底的
// check-then-act 必须进 services 且同事务——这里的计数就是这种，只包事务挡不住并发，
// 计数还得是锁读）；控制器只做「取参 → 调 service → 响应」，保持 0 事务
exports.deleteAdmin = async (req, res) => {
  const adminId = adminIdDTO(req.params);

  await deleteAdminWithGuard(adminId, req.admin.admin_id);

  res.json({ id: adminId, message: '删除成功' });
};
