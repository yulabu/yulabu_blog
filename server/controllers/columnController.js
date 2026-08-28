const fs = require('fs').promises;
const { Op } = require('sequelize');
const AppError = require('@middleware/AppError');
const { sequelize, Column, ColumnPost, Post, Tag, Image } = require('@models');
const { createColumnDTO, updateColumnDTO, columnIdDTO, columnPostIdsDTO } = require('@dto/column.dto');
const { columnDetail, columnList, columnPostItem } = require('@vo/column.vo');
const { unbindCover } = require('@utils/image');
const { saveImageFile, deleteImageFiles } = require('@utils/imageStorage');

// 统计每个专栏的文章数
async function countPostsByColumn(columns) {
  const ids = columns.map(c => c.column_id);
  if (!ids.length) return {};
  const counts = await ColumnPost.findAll({
    where: { column_id: { [Op.in]: ids } },
    attributes: ['column_id', [sequelize.fn('COUNT', sequelize.col('post_id')), 'cnt']],
    group: ['column_id'],
    raw: true
  });
  const countMap = {};
  for (const row of counts) countMap[row.column_id] = Number(row.cnt);
  return countMap;
}

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

// 专栏封面上传（单张）：转码落盘 + 写入 Image 记录（reference_type=cover 绑定专栏）
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
    const info = await saveImageFile(file.path);
    const record = await Image.create({
      reference_type: 'cover',
      reference_id: id,
      storage_path: info.storagePath,
      thumb_path: info.thumbPath,
      file_size: info.fileSize
    });
    res.json({
      image: {
        image_id: record.image_id,
        url: `/uploads/${info.storagePath}`,
        thumb_url: `/uploads/${info.thumbPath}`
      }
    });
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
  await column.update(data);

  // 封面变更后差集解绑：column_cover 不再引用的封面图置为孤儿（24h 宽限期后由 GC 物理删除）
  if (data.column_cover !== undefined) {
    await unbindCover(id, data.column_cover);
  }

  res.json({ id: column.column_id, message: '更新成功' });
};

exports.deleteColumn = async (req, res) => {
  const id = columnIdDTO(req.params);
  const column = await Column.findByPk(id);
  if (!column) throw new AppError(404, '专栏不存在');

  // 收集专栏绑定封面图（删除时同步物理清理，不残留孤儿）
  const coverImages = await Image.findAll({
    where: { reference_type: 'cover', reference_id: id }
  });

  await sequelize.transaction(async (t) => {
    await ColumnPost.destroy({ where: { column_id: id }, transaction: t });
    if (coverImages.length > 0) {
      await Image.destroy({
        where: { image_id: { [Op.in]: coverImages.map(img => img.image_id) } },
        transaction: t
      });
    }
    await column.destroy({ transaction: t });
  });

  // 事务成功后删文件（单个失败忽略，避免残留文件阻塞删除）
  for (const image of coverImages) {
    await deleteImageFiles(image.storage_path, image.thumb_path);
  }

  res.json({ message: '删除成功' });
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
  const postId = Number(req.body.post_id);
  if (!postId || postId < 1) throw new AppError(400, '无效的文章ID');

  const column = await Column.findByPk(columnId);
  if (!column) throw new AppError(404, '专栏不存在');
  const post = await Post.findByPk(postId);
  if (!post) throw new AppError(404, '文章不存在');

  await sequelize.transaction(async (t) => {
    await ColumnPost.destroy({ where: { post_id: postId }, transaction: t });
    const max = await ColumnPost.max('sort_order', { where: { column_id: columnId }, transaction: t });
    await ColumnPost.create({
      column_id: columnId,
      post_id: postId,
      sort_order: (max || 0) + 1
    }, { transaction: t });
  });

  res.json({ message: '已添加到专栏' });
};

// 从专栏移出
exports.removeColumnPost = async (req, res) => {
  const columnId = columnIdDTO(req.params);
  const postId = Number(req.params.postId);
  if (!postId || postId < 1) throw new AppError(400, '无效的文章ID');

  const count = await ColumnPost.destroy({
    where: { column_id: columnId, post_id: postId }
  });
  if (!count) throw new AppError(404, '该文章不在专栏中');

  res.json({ message: '已移出专栏' });
};

// 拖拽提交顺序（按数组序重写 sort_order）
exports.updateColumnPostOrder = async (req, res) => {
  const columnId = columnIdDTO(req.params);
  const postIds = columnPostIdsDTO(req.body);

  await sequelize.transaction(async (t) => {
    for (let i = 0; i < postIds.length; i++) {
      await ColumnPost.update(
        { sort_order: i + 1 },
        { where: { column_id: columnId, post_id: postIds[i] }, transaction: t }
      );
    }
  });

  res.json({ message: '排序已保存' });
};