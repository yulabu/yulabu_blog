const { Op } = require('sequelize');
const { Post, Tag } = require('@models');
const { postSummary } = require('@vo/post.vo');

// 工作台统计数据
exports.getDashboard = async (req, res) => {
  const total = await Post.count();
  const published = await Post.count({ where: { post_status: 'published' } });
  const trash = await Post.count({ where: { post_status: 'trash' } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
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