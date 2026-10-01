const fs = require('fs').promises;
const { Op } = require('sequelize');
const AppError = require('@errors/AppError');
const { Column, ColumnPost, Post, Tag } = require('@models');
const { createColumnDTO, updateColumnDTO, columnIdDTO, addColumnPostDTO, columnPostParamsDTO, columnPostIdsDTO } = require('@dto/column.dto');
const { columnDetail, columnList, columnPostItem } = require('@vo/column.vo');
const { resolveImageIdByUrl } = require('@services/image/derive');
const { createImageFromUpload } = require('@services/image/upload');
// 计数聚合与三处多表写（事务）都在 service（判据①②）
const { countPostsByColumn, deleteWithPosts, movePostToColumn, reorderPosts } = require('@services/column');
const { uploadedImageVO } = require('@vo/image.vo');

// ========== 公开接口 ==========

exports.getPublicColumns = async (req, res) => {
  const columns = await Column.findAll({
    where: { status: 'show' },
    order: [['sort_order', 'ASC'], ['column_id', 'ASC']]
  });

  const countMap = await countPostsByColumn(columns);

  res.json(columnList(columns, countMap));
};

exports.getColumnById = async (req, res) => {
  const id = columnIdDTO(req.params);
  const column = await Column.findByPk(id);
  if (!column || column.status !== 'show') throw new AppError(404, '专栏不存在');

  const columnPosts = await ColumnPost.findAll({
    where: { column_id: id },
    include: {
      model: Post,
      as: 'post',
      where: { post_status: 'published' },
      include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name'] },
      required: true
    },
    order: [['sort_order', 'ASC'], ['column_post_id', 'ASC']]
  });

  const posts = columnPosts.map(cp => columnPostItem(cp.post, cp.sort_order));
  res.json({ ...columnDetail(column, posts.length), posts });
};

// ========== 管理接口 ==========

// 专栏封面上传（单张）：转码落盘 + 写入 image 记录（纯上传，不绑定业务）
// 一次只传一张；临时文件由本函数 finally 清理（GC 兜底过期清理）
exports.uploadColumnCover = async (req, res) => {
  const id = columnIdDTO(req.params);
  const column = await Column.findByPk(id);
  if (!column) throw new AppError(404, '专栏不存在');

  const file = req.file;
  if (!file) {
    throw new AppError(400, '没有上传文件');
  }

  try {
    res.json({ image: uploadedImageVO(await createImageFromUpload(file.path)) });
  } finally {
    try {
      await fs.unlink(file.path);
    } catch (err) {
      // 忽略清理失败
    }
  }
};

exports.getAdminColumns = async (req, res) => {
  const columns = await Column.findAll({
    order: [['sort_order', 'ASC'], ['column_id', 'ASC']]
  });

  const countMap = await countPostsByColumn(columns);

  res.json(columnList(columns, countMap));
};

exports.createColumn = async (req, res) => {
  const data = createColumnDTO(req.body);
  const column = await Column.create(data);
  res.status(201).json({ id: column.column_id, message: '创建成功' });
};

exports.updateColumn = async (req, res) => {
  const id = columnIdDTO(req.params);
  const column = await Column.findByPk(id);
  if (!column) throw new AppError(404, '专栏不存在');
  const data = updateColumnDTO(req.body);

  // 封面 URL → image_id 派生；换封面后旧图失去引用，由 GC 对账回收
  if (data.column_cover !== undefined) {
    data.cover_image_id = await resolveImageIdByUrl(data.column_cover);
  }
  await column.update(data);

  res.json({ id: column.column_id, message: '更新成功' });
};

exports.deleteColumn = async (req, res) => {
  const id = columnIdDTO(req.params);
  const column = await Column.findByPk(id);
  if (!column) throw new AppError(404, '专栏不存在');

  await deleteWithPosts(id);

  res.json({ id, message: '删除成功' });
};

// 专栏文章排序页数据：专栏内文章 + 候选文章
exports.getColumnPosts = async (req, res) => {
  const id = columnIdDTO(req.params);
  const column = await Column.findByPk(id);
  if (!column) throw new AppError(404, '专栏不存在');

  const columnPosts = await ColumnPost.findAll({
    where: { column_id: id },
    include: {
      model: Post,
      as: 'post',
      include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name'] },
      required: true
    },
    order: [['sort_order', 'ASC'], ['column_post_id', 'ASC']]
  });

  const inColumnIds = columnPosts.map(cp => cp.post_id);

  const candidates = await Post.findAll({
    where: {
      post_status: 'published',
      post_id: { [Op.notIn]: inColumnIds.length ? inColumnIds : [0] }
    },
    include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name'] },
    order: [['created_at', 'DESC']]
  });

  res.json({
    column: columnDetail(column, columnPosts.length),
    posts: columnPosts.map(cp => columnPostItem(cp.post, cp.sort_order)),
    candidates: candidates.map(post => ({
      id: post.post_id,
      title: post.post_title,
      category: post.category ? { id: post.category.tag_id, name: post.category.tag_name } : null
    }))
  });
};

// 添加文章到专栏（自动追加末尾；若已在其他专栏先移出）
exports.addColumnPost = async (req, res) => {
  const columnId = columnIdDTO(req.params);
  const { post_id: postId } = addColumnPostDTO(req.body);

  const column = await Column.findByPk(columnId);
  if (!column) throw new AppError(404, '专栏不存在');
  const post = await Post.findByPk(postId);
  if (!post) throw new AppError(404, '文章不存在');

  await movePostToColumn(columnId, postId);

  res.json({ id: columnId, message: '已添加到专栏' });
};

// 从专栏移出
exports.removeColumnPost = async (req, res) => {
  const columnId = columnIdDTO(req.params);
  const { post_id: postId } = columnPostParamsDTO(req.params);

  const count = await ColumnPost.destroy({
    where: { column_id: columnId, post_id: postId }
  });
  if (!count) throw new AppError(404, '该文章不在专栏中');

  res.json({ id: columnId, message: '已移出专栏' });
};

// 拖拽提交顺序（按数组序重写 sort_order；整体一个事务，在 service 里）
exports.updateColumnPostOrder = async (req, res) => {
  const columnId = columnIdDTO(req.params);
  const postIds = columnPostIdsDTO(req.body);

  await reorderPosts(columnId, postIds);

  res.json({ id: columnId, message: '排序已保存' });
};