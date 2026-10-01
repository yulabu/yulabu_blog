require('module-alias/register');
require('dotenv').config({ quiet: true });
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
