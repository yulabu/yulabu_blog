// 基础配置
require('module-alias/register');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('@config/database');
const { publicLimiter, staticLimiter, adminLimiter } = require('@middleware/rateLimiter');

const app = express();
// 信任本机反向代理（Nginx），正确解析 X-Forwarded-For（express-rate-limit 8.x 校验要求）
app.set('trust proxy', 'loopback');
// 中间件
app.use(cors());
app.use(express.json());
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
const { UPLOAD_DIR } = require('@config/image');
// 静态图片服务
app.use('/uploads', staticLimiter, express.static(UPLOAD_DIR, {
  dotfiles: 'deny',
  index: false
}));
// 图片 GC：孤儿回收 + 废弃草稿清理 + 上传临时文件兜底
const { runGC } = require('@utils/gc');
// 导入模型
const { Post, Tag, Admin, FriendLink, Column, ColumnPost, Image, VisitLog } = require('@models');

// 同步数据库（创建表）
// 注意：开发期修改表结构时建议先手动迁移，或临时改为 { alter: true }。
// 长期开启 alter: true 在 MySQL 上容易因索引名不匹配而产生重复索引，
// 最终触发 ER_TOO_MANY_KEYS（max 64 keys allowed）。
const GC_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function runGCSafe() {
  try {
    const { orphans, drafts, tmpFiles } = await runGC();
    if (orphans || drafts || tmpFiles) {
      console.log(`GC 完成：孤儿图片 ${orphans} 张，废弃草稿 ${drafts} 篇，临时文件 ${tmpFiles} 个`);
    }
  } catch (err) {
    console.error('GC 失败:', err);
  }
}

sequelize.sync()
  .then(async () => {
    console.log('所有模型同步成功');
    // 一次性幂等结构同步：补齐 sync() 不处理的 ALTER（新增列/ENUM 追加），重复执行安全
    try {
      const syncSchema = require('./scripts/sync-schema');
      await syncSchema();
    } catch (e) {
      console.error('[sync-schema] 同步失败:', e.message);
    }
    // 依赖数据库表，需在 sync 之后执行；启动先跑一次，再每 24 小时执行
    runGCSafe();
    setInterval(runGCSafe, GC_INTERVAL_MS);
    // 访问日志 GC：独立定时器，每 24 小时清理 90 天前的日志
    const { cleanupOldVisitLogs } = require('@utils/visitGc');
    const runVisitGcSafe = async () => {
      try { await cleanupOldVisitLogs(); }
      catch (err) { console.error('[visit-gc] 失败:', err); }
    };
    runVisitGcSafe();
    setInterval(runVisitGcSafe, GC_INTERVAL_MS);
  })
  .catch(err => {
    console.error('同步失败:', err);
  });


// 测试路由
app.get('/', (req, res) => {
  res.send('Hello, Blog Backend!');
});

// 错误处理中间件，需在所有路由之后使用
const errorHandler = require('@middleware/errorHandler');
app.use(errorHandler);

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});