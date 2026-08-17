const AppError = require('@middleware/AppError');
const { parseId, paginate } = require('./common.dto');

function createMomentDTO(body) {
  const content = body.moment_content?.trim();

  if (!content) throw new AppError(400, '内容不能为空');

  const dto = { moment_content: content };

  if (body.moment_image !== undefined && body.moment_image !== null) {
    const image = body.moment_image.trim();
    if (image && image.length > 512) throw new AppError(400, '配图URL不能超过512个字符');
    dto.moment_image = image || null;
  }
  if (body.moment_status !== undefined) {
    if (!['show', 'hide'].includes(body.moment_status)) throw new AppError(400, '状态值无效');
    dto.moment_status = body.moment_status;
  }

  return dto;
}

function updateMomentDTO(body) {
  const dto = {};

  if (body.moment_content !== undefined) {
    const content = body.moment_content.trim();
    if (!content) throw new AppError(400, '内容不能为空');
    dto.moment_content = content;
  }
  if (body.moment_image !== undefined) {
    const image = body.moment_image?.trim() || null;
    if (image && image.length > 512) throw new AppError(400, '配图URL不能超过512个字符');
    dto.moment_image = image;
  }
  if (body.moment_status !== undefined) {
    if (!['show', 'hide'].includes(body.moment_status)) throw new AppError(400, '状态值无效');
    dto.moment_status = body.moment_status;
  }

  if (Object.keys(dto).length === 0) throw new AppError(400, '没有需要更新的字段');
  return dto;
}

function momentIdDTO(params) {
  return parseId(params, '碎碎念');
}

function listMomentsDTO(query) {
  const { page, limit, offset } = paginate(query);
  const q = query.q ? String(query.q).trim().slice(0, 32) : '';
  return { page, limit, offset, q };
}

module.exports = { createMomentDTO, updateMomentDTO, momentIdDTO, listMomentsDTO };
