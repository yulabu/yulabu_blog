require('module-alias/register');
require('dotenv').config({ quiet: true });
const bcrypt = require('bcrypt');
const { Admin, sequelize } = require('@models');
const { seed: seedAdmin } = require('@config/env');
const { infoLine } = require('@utils/log');

async function seed() {
  await sequelize.sync();
  const { name, password } = seedAdmin;
  const hash = await bcrypt.hash(password, 12);
  await Admin.create({
    admin_name: name,
    admin_password: hash,
    admin_avatar: null
  });
  console.log(infoLine('seed', `管理员创建成功: ${name}`));
  process.exit(0);
}

seed();
