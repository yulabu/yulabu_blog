// 文章域的服务层：归档分组（判据④领域派生）与彻底删除（判据②多表写）。
const { sequelize, Post, Tag, ColumnPost, PostImage, Image } = require('@models');
const { beijingYearMonth } = require('@utils/date');

// 归档：取全部已发布文章并按**北京自然月**分组，返回 { 年: { 月: [原始行] } }。
// 年月必须走 utils/date 派生——UTC 进程下用本地 getFullYear/getMonth 会把北京时间月初
// 00:00–08:00 发的文章归到上个月（实修过）。响应形状（archives 数组 + count）留给控制器组装
async function groupByBeijingMonth() {
  const posts = await Post.findAll({
    where: { post_status: 'published' },
    include: [
      { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name'] },
      // 与列表接口保持一致：归档行也要带 coverThumb（契约统一，避免两种形状）
      { model: Image, as: 'coverImage', attributes: ['thumb_path'] }
    ],
    order: [['created_at', 'DESC']]
  });

  const grouped = {};
  for (const post of posts) {
    const { year, month } = beijingYearMonth(post.createdAt);
    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][month]) grouped[year][month] = [];
    grouped[year][month].push(post);
  }
  return grouped;
}

// 彻底删除：先清关联行（正文图片关联、专栏关联）再删主行，必须原子（判据②）。
// 图片引用随行消失，物理文件由 GC 对账宽限后回收
async function forceRemove(postId) {
  await sequelize.transaction(async (t) => {
    await PostImage.destroy({ where: { post_id: postId }, transaction: t });
    await ColumnPost.destroy({ where: { post_id: postId }, transaction: t });
    await Post.destroy({ where: { post_id: postId }, transaction: t });
  });
}

module.exports = { groupByBeijingMonth, forceRemove };
