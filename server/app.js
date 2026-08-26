// 基础配置
require('module-alias/register');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('@config/database');
const { publicLimiter, staticLimiter, adminLimiter } = require('@middleware/rateLimiter');

const app = express();
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
// notice路由
const noticeRoutes = require('@routes/noticeRoutes');
app.use('/api/notices', publicLimiter, noticeRoutes);
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
const { UPLOAD_DIR } = require('@config/image');
// 静态图片服务
app.use('/uploads', staticLimiter, express.static(UPLOAD_DIR, {
  dotfiles: 'deny',
  index: false
}));
// 图片 GC：孤儿回收 + 废弃草稿清理 + 历史遗留 temp 目录兜底
const { runGC } = require('@utils/gc');
// 导入模型
const { Post, Tag, Admin, Notice, FriendLink, Column, ColumnPost, Image } = require('@models');

// 同步数据库（创建表）
// 注意：开发期修改表结构时建议先手动迁移，或临时改为 { alter: true }。
// 长期开启 alter: true 在 MySQL 上容易因索引名不匹配而产生重复索引，
// 最终触发 ER_TOO_MANY_KEYS（max 64 keys allowed）。
const GC_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function runGCSafe() {
  try {
    const { orphans, drafts } = await runGC();
    if (orphans || drafts) {
      console.log(`GC 完成：孤儿图片 ${orphans} 张，废弃草稿 ${drafts} 篇`);
    }
  } catch (err) {
    console.error('GC 失败:', err);
  }
}

sequelize.sync()
  .then(() => {
    console.log('所有模型同步成功');
    // 依赖数据库表，需在 sync 之后执行；启动先跑一次，再每 24 小时执行
    runGCSafe();
    setInterval(runGCSafe, GC_INTERVAL_MS);
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