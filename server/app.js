// 基础配置
require('module-alias/register');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('@config/database');

const app = express();
// 中间件
app.use(cors());
app.use(express.json());
// post路由
const postRoutes = require('@routes/postRoutes');
app.use('/api/posts', postRoutes);
// auth路由
const authRoutes = require('@routes/authRoutes');
app.use('/api/auth', authRoutes);
// tag路由
const tagRoutes = require('@routes/tagRoutes');
app.use('/api/tags', tagRoutes);
// notice路由
const noticeRoutes = require('@routes/noticeRoutes');
app.use('/api/notices', noticeRoutes);
// admin路由
const adminRoutes = require('@routes/adminRoutes');
app.use('/api/admin', adminRoutes);
// 上传路由
const uploadRoutes = require('@routes/uploadRoutes');
const { UPLOAD_DIR } = require('@config/upload');
app.use('/api/upload', uploadRoutes);
// 静态图片服务
app.use('/uploads', express.static(UPLOAD_DIR, {
  dotfiles: 'deny',
  index: false
}));
// 图片清理
const { cleanupOldTempDirs } = require('@utils/image');
// 导入模型
const { Post, Tag, Admin, Notice } = require('@models');

// 同步数据库（创建表）
// 注意：开发期修改表结构时建议先手动迁移，或临时改为 { alter: true }。
// 长期开启 alter: true 在 MySQL 上容易因索引名不匹配而产生重复索引，
// 最终触发 ER_TOO_MANY_KEYS（max 64 keys allowed）。
sequelize.sync()
  .then(() => {
    console.log('所有模型同步成功');
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

// 启动后异步清理过期临时目录，失败不影响服务
cleanupOldTempDirs().catch(err => {
  console.error('清理临时目录失败:', err);
});