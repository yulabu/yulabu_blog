const { Post } = require('../models');

// 获取所有文章列表
exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.findAll();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};