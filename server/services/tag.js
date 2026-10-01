// 分类（tag）域的服务层。
// 判据①：分组聚合 SQL 必须进 services——控制器只做「取参 → 调这里 → vo 组装」。
// 判据②①（2026-10 第二轮）：删除守卫（分类下还有文章则拒）与「查了再删」的多步写也在这里，
// 与 services/image/remove.js 的引用守卫同构——守卫一律在 services，controller 不自己写。
const { Sequelize } = require('sequelize');
const AppError = require('@errors/AppError');
const { sequelize, Post, Tag } = require('@models');

// 分类列表（含已发布文章数）：LEFT JOIN + GROUP BY，raw 行交给 vo 组装。
// 统计口径是「已发布」——草稿/回收站不计入分类的 count。
// 传 tagId 时只查这一条：详情接口复用同一份 SQL 与口径（这是 count 的唯一出处）
async function listTagsWithPostCounts({ tagId } = {}) {
  return Tag.findAll({
    where: tagId ? { tag_id: tagId } : undefined,
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

// 单个分类（含已发布文章数）；不存在返回 null，404 由 controller 抛。
// 改前详情接口走 Tag.findByPk + include 全部文章，而 vo 读的是 tag.count —— 模型实例没有该字段
// （只有上面这种 raw 聚合行才有），所以公开接口 /api/tags/:id 的 count 恒为 0；那个 include
// 还没带状态过滤（将来若被 vo 消费会泄露草稿标题）。现在两处 count 同源。
async function getTagWithCount(tagId) {
  const rows = await listTagsWithPostCounts({ tagId });
  return rows[0] || null;
}

// 删除分类：存在性 → 文章数守卫 → 同一事务内删除（命中判据②的 check-then-act）。
// 事务不是为了防并发（单用户后台；真要并发，最后一道防线是 post.post_category_id 的外键），
// 而是保证中途失败不留下半删状态。守卫用 400（业务拒绝），文案与改前逐字一致。
async function deleteTagWithGuard(tagId) {
  return sequelize.transaction(async (t) => {
    const tag = await Tag.findByPk(tagId, { transaction: t });
    if (!tag) throw new AppError(404, '分类不存在');

    const postsCount = await Post.count({ where: { post_category_id: tagId }, transaction: t });
    if (postsCount > 0) throw new AppError(400, `该分类下存在${postsCount}篇文章，无法删除`);

    await tag.destroy({ transaction: t });
    return tag;
  });
}

module.exports = { listTagsWithPostCounts, getTagWithCount, deleteTagWithGuard };
