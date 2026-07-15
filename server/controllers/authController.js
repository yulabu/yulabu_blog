const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AppError = require('../middleware/AppError');

const { Admin } = require('../models');
const { loginDTO } = require('../dto/auth.dto');
const { loginResult } = require('../vo/auth.vo');

exports.login = async (req, res) => {
  const { admin_name, admin_password } = loginDTO(req.body);

  const admin = await Admin.findOne({ where: { admin_name } });
  if (!admin) {
    throw new AppError(401, '用户名或密码错误');
  }

  const valid = await bcrypt.compare(admin_password, admin.admin_password);
  if (!valid) {
    throw new AppError(401, '用户名或密码错误');
  }

  const token = jwt.sign(
    { admin_id: admin.admin_id, admin_name: admin.admin_name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json(loginResult(token, admin));
};