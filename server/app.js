// 基础配置：别名 + 环境变量 + 进程级未处理异常兜底（唯一出处 server/bootstrap.js）
require('./bootstrap');
const express = require('express');
const cors = require('cors');
const env = require('@config/env');
const { sequelize } = require('@config/database');
const { publicLimiter, staticLimiter, adminLimiter } = require('@middleware/rateLimiter');
const { infoLine, errTagLine } = require('@utils/log');

const app = express();
// 信任本机反向代理（Nginx），正确解析 X-Forwarded-For（express-rate-limit 8.x 校验要求）
app.set('trust proxy', 'loopback');
// 中间件
app.use(cors());
// 默认 100kb 装不下长正文：正文以 JSON 提交（POST/PUT /api/admin/posts），
// 一篇文章超过约 3.3 万字就会被 body-parser 拦成 413「请求体过大」而保存失败。
// 2mb 足够容纳超长图文（图片本身走 multipart，不占这个额度），仍远小于 nginx 的 10m
app.use(express.json({ limit: '2mb' }));
// Express 5 不再把"没有 body"的请求初始化为 {}：请求没有 body 头、或 Content-Type
// 不是 JSON（本项目只挂了 json 解析器）时 req.body 会是 undefined。各 DTO 都是照
// Express 4 的契约写的（body 必定是对象，最差空对象），于是 body.x 直接抛 TypeError
// → 落到兜底 500。实测外网扫描器一个裸 POST 就能打到（188.253.112.119 等 6 个 IP，
// 4 秒内 6 次，User-Agent 是光秃秃的 Mozilla/5.0）。
// 这里还原 Express 4 的契约：DTO 拿到空对象后，会按约定抛 AppError(400) 比如
// 「用户名不能为空」——空 body 依然被拒绝，只是从"崩溃式 500"变成"说明式 400"
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});
// post路由
const postRoutes = require('@routes/postRoutes');
app.use('/api/posts', publicLimiter, postRoutes);
// auth路由
const authRoutes = require('@routes/authRoutes');
app.use('/api/auth', authRoutes);
// tag路由
const tagRoutes = require('@routes/tagRoutes');
app.use('/api/tags', publicLimiter, tagRoutes);
// friendlink路由
const friendLinkRoutes = require('@routes/friendLinkRoutes');
app.use('/api/friendlinks', publicLimiter, friendLinkRoutes);
// column路由
const columnRoutes = require('@routes/columnRoutes');
app.use('/api/columns', publicLimiter, columnRoutes);
// admin路由
const adminRoutes = require('@routes/adminRoutes');
app.use('/api/admin', adminLimiter, adminRoutes);
// 图片路由
const imageRoutes = require('@routes/imageRoutes');
app.use('/api/images', adminLimiter, imageRoutes);
// 访问记录路由
const visitRoutes = require('@routes/visitRoutes');
app.use('/api/visits', publicLimiter, visitRoutes);
// 日记路由
const diaryRoutes = require('@routes/diaryRoutes');
app.use('/api/diaries', publicLimiter, diaryRoutes);
// 站点设置路由（公开读；写入口在 /api/admin/settings）
const settingRoutes = require('@routes/settingRoutes');
app.use('/api/settings', publicLimiter, settingRoutes);
// 音乐歌单路由（公开读；解析直链的接口只对配置歌单内的曲目放行）
const musicRoutes = require('@routes/musicRoutes');
app.use('/api/music', publicLimiter, musicRoutes);
const { UPLOAD_DIR } = require('@config/image');
// 静态图片服务
app.use('/uploads', staticLimiter, express.static(UPLOAD_DIR, {
  dotfiles: 'deny',
  index: false
}));
// 定时任务：图片 GC / 每日统计聚合 / 访问日志清理。调度、间隔与依赖声明都在 jobs/index.js，
// 本文件只负责「数据库就绪后启动它们」——任务细节（阈值、幂等、失败日志）不进进程入口
const { startJobs } = require('@jobs');
// 导入模型（保证所有模型在 sync 前注册完成）
const { Post, Tag, Admin, FriendLink, Column, ColumnPost, Image, VisitLog, Diary } = require('@models');
const syncSchema = require('./scripts/sync-schema');

// 测试路由
app.get('/', (req, res) => {
  res.send('Hello, Blog Backend!');
});

// 未命中路由：JSON 404 终结器（它是终结器不是错误处理器，挂在 errorHandler 之前）
const notFound = require('@middleware/notFound');
app.use(notFound);

// 错误处理中间件，需在所有路由之后，且必须是最后一个
const errorHandler = require('@middleware/errorHandler');
app.use(errorHandler);

// 启动顺序：数据库就绪 → 结构补齐 → 定时任务 → 才接流量。
//
// 「端口开着 = 服务可用」是刻意的：改前 listen 在 sync 之前，DB 没起来时端口已经接受连接、
// 所有接口 5xx/503，进程处在一个说不清状态的「半死」态。现在任一步失败都记 [err]（含堆栈）
// 后 exit(1)，交 PM2 按退避策略重启——宁可让外部看到连接被拒，也不要一个假装活着的服务。
//
// 注意：sync() 只建表 + 补齐模型声明的索引，**不做 ALTER**；新增列 / ENUM 值归 sync-schema.js。
// 长期开 { alter: true } 在 MySQL 上容易因索引名不匹配产生重复索引，最终 ER_TOO_MANY_KEYS
const PORT = env.port;

async function start() {
  await sequelize.sync();
  console.log(infoLine('server', '所有模型同步成功'));

  await syncSchema();   // 一次性幂等结构同步（幂等：重复执行安全）
  startJobs();          // 定时任务依赖数据库表，必须在 sync 之后

  const server = app.listen(PORT, () => {
    // 延后一个 tick 再报成功：个别平台（macOS 实测）在 :: 与已有监听冲突时先回调再发 'error'，
    // 直接打印会留下「Server is running」紧跟一行失败的自相矛盾日志；失败时进程已 exit(1)，
    // 这行根本不会打出来
    setImmediate(() => console.log(infoLine('server', `Server is running on http://localhost:${PORT}`)));
  });
  // 端口占用这类监听失败要当场说清楚，别让它变成 uncaughtException 里的一行堆栈
  server.on('error', (err) => {
    console.error(`${errTagLine('server', `端口 ${PORT} 监听失败: ${err.message}`)}\n${err.stack || ''}`);
    process.exit(1);
  });
}

start().catch((err) => {
  console.error(`${errTagLine('server', '启动失败')}\n${err.stack || ''}`);
  process.exit(1);
});