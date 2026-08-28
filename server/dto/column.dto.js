const AppError = require('@middleware/AppError');
const { parseId } = require('./common.dto');

function createColumnDTO(body) {
  const name = body.column_name?.trim();

  if (!name) throw new AppError(400, '专栏名称不能为空');
  if (name.length > 32) throw new AppError(400, '专栏名称不能超过32个字符');

  const dto = { column_name: name };

  if (body.column_desc !== undefined) {
    const desc = body.column_desc?.trim() || null;
    if (desc && desc.length > 128) throw new AppError(400, '专栏简介不能超过128个字符');
    dto.column_desc = desc;
  }
  if (body.column_cover !== undefined) {
    const cover = body.column_cover?.trim() || null;
    if (cover && cover.length > 512) throw new AppError(400, '封面图URL不能超过512个字符');
    dto.column_cover = cover;
  }
  if (body.sort_order !== undefined) {
    const order = parseInt(body.sort_order);
    if (isNaN(order)) throw new AppError(400, '排序值无效');
    dto.sort_order = order;
  }
  if (body.status !== undefined) {
    if (!['show', 'hide', 'draft'].includes(body.status)) throw new AppError(400, '状态值无效');
    dto.status = body.status;
  }

  return dto;
}

function updateColumnDTO(body) {
  const dto = {};

  if (body.column_name !== undefined) {
    const name = body.column_name?.trim();
    if (!name) throw new AppError(400, '专栏名称不能为空');
    if (name.length > 32) throw new AppError(400, '专栏名称不能超过32个字符');
    dto.column_name = name;
  }
  if (body.column_desc !== undefined) {
    const desc = body.column_desc?.trim() || null;
    if (desc && desc.length > 128) throw new AppError(400, '专栏简介不能超过128个字符');
    dto.column_desc = desc;
  }
  if (body.column_cover !== undefined) {
    const cover = body.column_cover?.trim() || null;
    if (cover && cover.length > 512) throw new AppError(400, '封面图URL不能超过512个字符');
    dto.column_cover = cover;
  }
  if (body.sort_order !== undefined) {
    const order = parseInt(body.sort_order);
    if (isNaN(order)) throw new AppError(400, '排序值无效');
    dto.sort_order = order;
  }
  if (body.status !== undefined) {
    if (!['show', 'hide', 'draft'].includes(body.status)) throw new AppError(400, '状态值无效');
    dto.status = body.status;
  }

  if (Object.keys(dto).length === 0) throw new AppError(400, '没有需要更新的字段');
  return dto;
}

function columnIdDTO(params) {
  return parseId(params, '专栏');
}

function columnPostIdsDTO(body) {
  const postIds = body.post_ids;
  if (!Array.isArray(postIds) || postIds.length === 0) {
    throw new AppError(400, '文章列表不能为空');
  }
  const ids = postIds.map(id => Number(id));
  if (ids.some(id => !Number.isInteger(id) || id < 1)) {
    throw new AppError(400, '文章ID无效');
  }
  if (new Set(ids).size !== ids.length) {
    throw new AppError(400, '文章ID重复');
  }
  return ids;
}

module.exports = { createColumnDTO, updateColumnDTO, columnIdDTO, columnPostIdsDTO };