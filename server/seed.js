require('dotenv').config();
const bcrypt = require('bcrypt');
const { Admin, sequelize } = require('./models');

async function seed() {
  await sequelize.sync();
  const hash = await bcrypt.hash('nxd', 10);
  await Admin.create({
    admin_name: 'yulabu',
    admin_password: hash,
    admin_avatar: null
  });
  console.log('管理员创建成功: yulabu / yulabu');
  process.exit(0);
}

seed();