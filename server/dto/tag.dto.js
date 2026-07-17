const AppError = require('../middleware/AppError');

function isValidHexColor(color) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

function createTagDTO(body) {
  const name = body.tag_name?.trim();
  const tag_color = body.tag_color;

  if (!name) throw new AppError(400, '标签名不能为空');
  if (name.length > 32) throw new AppError(400, '标签名不能超过32个字符');
  if (!tag_color || !isValidHexColor(tag_color)) throw new AppError(400, '标签颜色不能为空且必须是有效的十六进制颜色值');
  return {
    tag_name: name,
    tag_color: tag_color,
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

  if (body.tag_color !== undefined) {
    const tag_color = body.tag_color;
    if (!tag_color || !isValidHexColor(tag_color)) throw new AppError(400, '标签颜色不能为空且必须是有效的十六进制颜色值');
    dto.tag_color = tag_color;
  }

  if (Object.keys(dto).length === 0) {
    throw new AppError(400, '没有需要更新的字段');
  }

  return dto;
}

function tagIdDTO(params) {
  const id = Number(params.id);
  if (!id || id < 1) throw new AppError(400, '无效的标签ID');
  return id;
}

module.exports = { createTagDTO, updateTagDTO, tagIdDTO };