const AppError = require('../middleware/AppError');
const { Post, Tag } = require('../models');
const { postSummary } = require('../vo/post.vo');

// 工作台统计数据
exports.getDashboard = async (req, res) => {
  const total = await Post.count();
  const published = await Post.count({ where: { post_status: 'published' } });
  const trash = await Post.count({ where: { post_status: 'trash' } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { Op } = require('sequelize');
  const todayCount = await Post.count({
    where: {
      post_status: 'published',
      created_at: { [Op.gte]: today }
    }
  });

  const recentPosts = await Post.findAll({
    where: { post_status: 'published' },
    include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name'] },
    order: [['created_at', 'DESC']],
    limit: 5
  });

  res.json({
    todayCount,
    totalCount: total,
    publishedCount: published,
    trashCount: trash,
    recentPosts: recentPosts.map(postSummary)
  });
};

// 获取回收站文章列表
exports.getTrashPosts = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
  const offset = (page - 1) * limit;

  const { rows: posts, count: total } = await Post.findAndCountAll({
    where: { post_status: 'trash' },
    include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name'] },
    order: [['updated_at', 'DESC']],
    limit,
    offset
  });

  res.json({
    posts: posts.map(postSummary),
    total,
    page,
    totalPages: Math.ceil(total / limit)
  });
};

// 恢复文章
exports.restorePost = async (req, res) => {
  const postId = Number(req.params.id);
  if (!postId || postId < 1) throw new AppError(400, '无效的文章ID');

  const post = await Post.findByPk(postId);
  if (!post) throw new AppError(404, '文章不存在');
  if (post.post_status !== 'trash') throw new AppError(400, '文章不在回收站');

  await post.update({ post_status: 'published' });
  res.json({ message: '恢复成功' });
};

// 彻底删除文章
exports.forceDeletePost = async (req, res) => {
  const postId = Number(req.params.id);
  if (!postId || postId < 1) throw new AppError(400, '无效的文章ID');

  const post = await Post.findByPk(postId);
  if (!post) throw new AppError(404, '文章不存在');

  await post.destroy();
  res.json({ message: '已彻底删除' });
};
