const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    // 固定东八区：DATETIME 列按本地时间存取（Sequelize 默认 +00:00 会存 UTC 字符串，看库偏差 8h）
    timezone: '+08:00',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    }
  }
);

module.exports = sequelize;