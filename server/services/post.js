// 文章域的服务层：归档分组（判据④领域派生）、写入与删除（判据②多表写，全部单事务）。
//
// 2026-10 第二轮收口：文章的「业务行 + 封面指针 + 正文图片关联」改成一件事——
// 改前 createPost / updatePost 是 controller 里的两步写（Post.create 与 syncPostImages 各自开事务），
// 第二步失败会留下「文章在、引用不在」：正文里的图没有指针 → GC 宽限后物理删除 → 文章图挂掉。
const { sequelize, Post, Tag, ColumnPost, PostImage, Image } = require('@models');
const { beijingYearMonth } = require('@utils/date');
const { resolveImageIdByUrl, syncPostImages } = require('@services/image/derive');

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

// 创建文章：封面派生 + 建行 + 正文图片关联，同一事务（判据②）。
// data 即 createPostDTO 的白名单结果（post_cover 必定存在，可为 null）
async function createWithRefs(data) {
  return sequelize.transaction(async (t) => {
    const payload = { ...data };
    if (payload.post_cover !== undefined) {
      payload.cover_image_id = await resolveImageIdByUrl(payload.post_cover);
    }
    const post = await Post.create(payload, { transaction: t });
    await syncPostImages(post.post_id, post.post_content, t);
    return post;
  });
}

// 更新文章：同上；只有正文真的传了才重建关联（与改前行为一致，局部更新不碰关联行）
async function updateWithRefs(post, data) {
  return sequelize.transaction(async (t) => {
    const payload = { ...data };
    if (payload.post_cover !== undefined) {
      payload.cover_image_id = await resolveImageIdByUrl(payload.post_cover);
    }
    await post.update(payload, { transaction: t });
    if (payload.post_content !== undefined) {
      await syncPostImages(post.post_id, payload.post_content, t);
    }
    return post;
  });
}

// 移入回收站：状态改 trash 与「移出专栏」同一事务（判据②，改前是两次独立写）。
// 图片引用随行保留（trash 仍在库），恢复为草稿时引用还在
async function softRemove(postId) {
  await sequelize.transaction(async (t) => {
    await Post.update({ post_status: 'trash' }, { where: { post_id: postId }, transaction: t });
    await ColumnPost.destroy({ where: { post_id: postId }, transaction: t });
  });
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

module.exports = { groupByBeijingMonth, createWithRefs, updateWithRefs, softRemove, forceRemove };
