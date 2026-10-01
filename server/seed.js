// 统一引导：模块别名 + 环境变量 + 进程级未处理异常兜底（见 server/bootstrap.js）
require('./bootstrap');
const { Admin, sequelize } = require('@models');
const { seed: seedAdmin } = require('@config/env');
const { infoLine } = require('@utils/log');
// 口令哈希的唯一出口（改前这里自己 import bcrypt 并硬编码轮数）
const password = require('@services/auth/password');

async function seed() {
  await sequelize.sync();
  const { name, password: seedPassword } = seedAdmin;
  await Admin.create({
    admin_name: name,
    admin_password: await password.hash(seedPassword),
    admin_avatar: null
  });
  console.log(infoLine('seed', `管理员创建成功: ${name}`));
  process.exit(0);
}

seed();
