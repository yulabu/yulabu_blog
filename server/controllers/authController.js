const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Admin } = require('../models');

exports.login = async (req, res) => {
  try {
    const { admin_name, admin_password } = req.body;
    if (!admin_name || !admin_password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    const admin = await Admin.findOne({ where: { admin_name } });
    if (!admin) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const valid = await bcrypt.compare(admin_password, admin.admin_password);
    if (!valid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { admin_id: admin.admin_id, admin_name: admin.admin_name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, admin: { id: admin.admin_id, name: admin.admin_name, avatar: admin.admin_avatar } });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};