const AppError = require('@middleware/AppError');
const { createPostDTO, updatePostDTO, listPostsDTO, postIdDTO } = require('@dto/post.dto');
const { parseId, paginate } = require('@dto/common.dto');
const { Post, Tag, ColumnPost, Column } = require('@models');
const { Op } = require('sequelize');
const { postDetail, postSummary } = require('@vo/post.vo');
const { prevNextVO } = require('@vo/column.vo');
const { finalizeTempImages, unbindUnusedFiles, deletePostImages } = require('@utils/image');

// 获取文章列表（带分类 + 关键词 + 分页）
exports.getPosts = async (req, res) => {

  const { page, limit, offset, category_id, q } = listPostsDTO(req.query);

  const where = { post_status: 'published' };
  if (category_id) {
    where.post_category_id = category_id;
  }
  if (q) {
    where.post_title = { [Op.like]: `%${q}%` };
  }
  const { rows: posts, count: total } = await Post.findAndCountAll({
    where,
    include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name'] },
    order: [['created_at', 'DESC']], // 按创建时间降序排列
    limit,
    offset,
  });

  res.json({ posts: posts.map(postSummary), total, page, totalPages: Math.ceil(total / limit) });

};

// 获取单篇文章详情
exports.getPostById = async (req, res) => {
  const postId = postIdDTO(req.params);
  const post = await Post.findByPk(postId, {
    include: [
      { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name'] },
      { model: ColumnPost, as: 'columnPost', include: { model: Column, as: 'column', attributes: ['column_id', 'column_name'] } }
    ],
  });
  if (!post || post.post_status !== 'published') throw new AppError(404, '文章不存在');
  res.json(postDetail(post));
};

// 获取上一篇（同专栏内 sort_order 小于当前的最大一篇）
exports.getPrevPost = async (req, res) => {
  const postId = postIdDTO(req.params);
  const columnPost = await ColumnPost.findOne({
    where: { post_id: postId },
    include: { model: Post, as: 'post', where: { post_status: 'published' }, required: true }
  });
  if (!columnPost) return res.json({ post: null });

  const prev = await ColumnPost.findOne({
    where: {
      column_id: columnPost.column_id,
      sort_order: { [Op.lt]: columnPost.sort_order }
    },
    include: { model: Post, as: 'post', where: { post_status: 'published' }, required: true },
    order: [['sort_order', 'DESC']]
  });
  res.json(prevNextVO(prev ? prev.post : null));
};

// 获取下一篇（同专栏内 sort_order 大于当前的最小一篇）
exports.getNextPost = async (req, res) => {
  const postId = postIdDTO(req.params);
  const columnPost = await ColumnPost.findOne({
    where: { post_id: postId },
    include: { model: Post, as: 'post', where: { post_status: 'published' }, required: true }
  });
  if (!columnPost) return res.json({ post: null });

  const next = await ColumnPost.findOne({
    where: {
      column_id: columnPost.column_id,
      sort_order: { [Op.gt]: columnPost.sort_order }
    },
    include: { model: Post, as: 'post', where: { post_status: 'published' }, required: true },
    order: [['sort_order', 'ASC']]
  });
  res.json(prevNextVO(next ? next.post : null));
};

// 获取文章归档：按年份和月份分组
exports.getArchive = async (req, res) => {
  const posts = await Post.findAll({
    where: { post_status: 'published' },
    include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name'] },
    order: [['created_at', 'DESC']],
  });

  const grouped = {};
  for (const post of posts) {
    const date = new Date(post.createdAt);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][month]) grouped[year][month] = [];
    grouped[year][month].push(postSummary(post));
  }

  const archives = Object.entries(grouped)
    .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
    .map(([year, months]) => {
      const yearPosts = Object.values(months).flat();
      return {
        year: Number(year),
        count: yearPosts.length,
        months: Object.entries(months)
          .sort(([monthA], [monthB]) => Number(monthB) - Number(monthA))
          .map(([month, monthPosts]) => ({
            month: Number(month),
            count: monthPosts.length,
            posts: monthPosts,
          })),
      };
    });

  res.json({ archives });
};

// 创建文章
exports.createPost = async (req, res) => {
  const { temp_id } = req.body;
  if (temp_id && !/^[a-zA-Z0-9_-]+$/.test(temp_id)) {
    throw new AppError(400, '无效的临时标识');
  }
  const data = createPostDTO(req.body);
  const post = await Post.create(data);

  if (temp_id) {
    const finalContent = await finalizeTempImages(
      post.post_id,
      temp_id,
      post.post_content
    );
    if (finalContent !== post.post_content) {
      await post.update({ post_content: finalContent });
    }
  }

  res.status(201).json({ id: post.post_id, message: '创建成功' });
};

// 更新文章
exports.updatePost = async (req, res) => {
  const postId = postIdDTO(req.params);
  const post = await Post.findByPk(postId);
  if (!post) throw new AppError(404, '文章不存在');

  const data = updatePostDTO(req.body);
  await post.update(data);

  // 正文变更后差集解绑：正文不再引用的图片置为孤儿（24h 宽限期后由 GC 物理删除）
  if (data.post_content !== undefined) {
    await unbindUnusedFiles(postId);
  }

  res.json({ id: post.post_id, message: '更新成功' });
};

// 差集解绑接口：前端离开编辑页时兜底调用（幂等）
exports.unbindImages = async (req, res) => {
  const postId = postIdDTO(req.params);
  const { unbound } = await unbindUnusedFiles(postId);
  res.json({ message: `已解绑 ${unbound} 张` });
};

// 删除文章（软删除，改为 trash 状态；顺带移出专栏）
exports.deletePost = async (req, res) => {
  const postId = postIdDTO(req.params);
  const post = await Post.findByPk(postId);
  if (!post) throw new AppError(404, '文章不存在');

  await post.update({ post_status: 'trash' });
  await ColumnPost.destroy({ where: { post_id: postId } });
  res.json({ message: '已移入回收站' });
};

// ========== 后台文章管理（三种状态统一列表，前端按 status 切换） ==========

// 后台文章列表：status 参数分别筛选 published / trash / draft 三种枚举，分页沿用项目惯例
exports.getAdminPosts = async (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const q = (req.query.q || '').trim().slice(0, 32) || null;
  const status = req.query.status;

  const where = {};
  if (status === 'published' || status === 'trash' || status === 'draft') {
    where.post_status = status;
  }
  if (q) {
    where.post_title = { [Op.like]: `%${q}%` };
  }

  const { rows: posts, count: total } = await Post.findAndCountAll({
    where,
    include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name'] },
    order: [['created_at', 'DESC']],
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

// 后台文章详情（不过滤状态，草稿/回收站均可查看编辑）
exports.getAdminPostById = async (req, res) => {
  const postId = parseId(req.params, '文章');
  const post = await Post.findByPk(postId, {
    include: [
      { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name'] },
      { model: ColumnPost, as: 'columnPost', include: { model: Column, as: 'column', attributes: ['column_id', 'column_name'] } }
    ]
  });
  if (!post) throw new AppError(404, '文章不存在');
  res.json(postDetail(post));
};

// 恢复文章
exports.restorePost = async (req, res) => {
  const postId = parseId(req.params, '文章');

  const post = await Post.findByPk(postId);
  if (!post) throw new AppError(404, '文章不存在');
  if (post.post_status !== 'trash') throw new AppError(400, '文章不在回收站');

  await post.update({ post_status: 'published' });
  res.json({ message: '恢复成功' });
};

// 彻底删除文章（沿用现有逻辑，未迁移）
exports.forceDeletePost = async (req, res) => {
  const postId = parseId(req.params, '文章');

  const post = await Post.findByPk(postId);
  if (!post) throw new AppError(404, '文章不存在');

  await post.destroy();
  await deletePostImages(postId);
  await ColumnPost.destroy({ where: { post_id: postId } });
  res.json({ message: '已彻底删除' });
};