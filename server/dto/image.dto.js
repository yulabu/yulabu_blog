const AppError = require('@errors/AppError');
// 类型白名单的唯一出处是 utils/imageRefTypes.js（三个真实引用类型 + 伪类型 other）——
// 改前这里手写了第二份，漏了 diary，导致只作日记封面的图任何筛选都查不到
const { IMAGE_LIST_TYPES } = require('@utils/imageRefTypes');
const { parseId, paginate } = require('./common.dto');

// ========== 图片列表查询参数 ==========
function imageListDTO(query) {
  const { page, limit, offset } = paginate(query);
  const type = query.type || null;
  if (type && !IMAGE_LIST_TYPES.includes(type)) {
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