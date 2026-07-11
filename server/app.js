// 基础配置
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');

const app = express();
// 中间件
app.use(cors());
app.use(express.json());
// post路由
const postRoutes = require('./routes/postRoutes');
app.use('/api/posts', postRoutes);

// 导入模型
const { Post, Tag } = require('./models');

// 同步数据库（创建表）
sequelize.sync({ alter: true })
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

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});