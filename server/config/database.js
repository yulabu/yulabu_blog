const { Sequelize } = require('sequelize');
const env = require('./env');
const { TZ_OFFSET } = require('./timezone');

// 连接参数（纯值）——Sequelize 与 mysqldump 共用的唯一出处。
// services/backup/run.js 的 defaults-extra-file 从这里取：改前它自己读 process.env 并自带一套默认值
// （'blog' / 'root' / '127.0.0.1'），于是「应用连的库」与「dump 备的库」可能不是同一个。
const dbConfig = {
  name: env.db.name,
  user: env.db.user,
  password: env.db.password,
  host: env.db.host,
  port: env.db.port
};

const sequelize = new Sequelize(dbConfig.name, dbConfig.user, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: 'mysql',
  // 固定东八区：DATETIME 列按本地时间存取（Sequelize 默认 +00:00 会存 UTC 字符串，看库偏差 8h）。
  // 偏移量的唯一事实在 config/timezone.js（utils/date.js 用同一个值算北京日期）
  timezone: TZ_OFFSET,
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  }
});

module.exports = { sequelize, dbConfig };
