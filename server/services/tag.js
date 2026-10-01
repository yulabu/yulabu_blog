// 分类（tag）域的服务层。
// 判据①：分组聚合 SQL 必须进 services——控制器只做「取参 → 调这里 → vo 组装」。
const { Sequelize } = require('sequelize');
const { Post, Tag } = require('@models');

// 分类列表（含已发布文章数）：LEFT JOIN + GROUP BY，raw 行交给 vo 组装。
// 统计口径是「已发布」——草稿/回收站不计入分类的 count
async function listTagsWithPostCounts() {
  return Tag.findAll({
    attributes: [
      'tag_id',
      'tag_name',
      [Sequelize.fn('COUNT', Sequelize.col('posts.post_id')), 'count']
    ],
    include: [{
      model: Post,
      as: 'posts',
      where: { post_status: 'published' },
      attributes: [],
      required: false
    }],
    group: ['Tag.tag_id', 'Tag.tag_name'],
    raw: true
  });
}

module.exports = { listTagsWithPostCounts };
