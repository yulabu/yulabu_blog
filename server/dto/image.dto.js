const AppError = require('@middleware/AppError');
const { parseId, paginate } = require('./common.dto');

const REFERENCE_TYPES = ['post_content', 'cover', 'friend_link', 'other'];

// ========== 图片列表查询参数 ==========
function imageListDTO(query) {
  const { page, limit, offset } = paginate(query);
  const type = query.type || null;
  if (type && !REFERENCE_TYPES.includes(type)) {
    throw new AppError(400, '无效的引用类型');
  }
  return { page, limit, offset, type };
}

// ========== 单张图片ID ==========
function imageIdDTO(params) {
  return parseId(params, '图片');
}

// ========== 批量删除的ID列表 ==========
function imageIdsDTO(body) {
  const ids = Array.isArray(body.ids)
    ? [...new Set(body.ids.map(Number).filter(n => n >= 1))]
    : [];
  if (ids.length === 0) {
    throw new AppError(400, '请选择要删除的图片');
  }
  return ids;
}

module.exports = { imageListDTO, imageIdDTO, imageIdsDTO };