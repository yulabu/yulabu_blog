const AppError = require('@middleware/AppError');
const { parseId } = require('./common.dto');

function createTagDTO(body) {
  const name = body.tag_name?.trim();

  if (!name) throw new AppError(400, '标签名不能为空');
  if (name.length > 32) throw new AppError(400, '标签名不能超过32个字符');
  return {
    tag_name: name,
  };
}

function updateTagDTO(body) {
  const dto = {};

  if (body.tag_name !== undefined) {
    const name = body.tag_name.trim();
    if (!name) throw new AppError(400, '标签名不能为空');
    if (name.length > 32) throw new AppError(400, '标签名不能超过32个字符');
    dto.tag_name = name;
  }

  if (Object.keys(dto).length === 0) {
    throw new AppError(400, '没有需要更新的字段');
  }

  return dto;
}

function tagIdDTO(params) {
  return parseId(params, '标签');
}

module.exports = { createTagDTO, updateTagDTO, tagIdDTO };