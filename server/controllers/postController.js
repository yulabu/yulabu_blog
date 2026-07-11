const { Post, Tag } = require('../models');

// 获取文章列表（带分类 + 分页）
exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { rows: posts, count: total } = await Post.findAndCountAll({
      include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name', 'tag_color'] },
      order: [['created_at', 'DESC']], // 按创建时间降序排列
      limit,
      offset,
    });

    res.json({ posts, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取单篇文章详情
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name', 'tag_color'] },
    });
    if (!post) return res.status(404).json({ message: '文章不存在' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 创建文章
exports.createPost = async (req, res) => {
  try {
    const { post_title, post_content, post_summary, post_author, post_category_id } = req.body;
    const post = await Post.create({ post_title, post_content, post_summary, post_author, post_category_id });
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 更新文章
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ message: '文章不存在' });

    const { post_title, post_content, post_summary, post_category_id, post_status } = req.body;
    await post.update({ post_title, post_content, post_summary, post_category_id, post_status });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除文章（软删除，改为 trash 状态）
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ message: '文章不存在' });

    await post.update({ post_status: 'trash' });
    res.json({ message: '已移入回收站' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};