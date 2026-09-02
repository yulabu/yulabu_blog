const AppError = require('@middleware/AppError');

function createDiaryDTO(body) {
  const content = body.content?.trim();

  if (!content) throw new AppError(400, '日记内容不能为空');
  if (content.length > 3000) throw new AppError(400, '日记内容不能超过3000个字符');

  const dto = { content };

  if (body.images !== undefined) {
    dto.images = Array.isArray(body.images) ? body.images : [];
  }

  return dto;
}

function updateDiaryDTO(body) {
  const dto = {};

  if (body.content !== undefined) {
    const content = body.content?.trim();
    if (!content) throw new AppError(400, '日记内容不能为空');
    if (content.length > 3000) throw new AppError(400, '日记内容不能超过3000个字符');
    dto.content = content;
  }
  if (body.images !== undefined) {
    dto.images = Array.isArray(body.images) ? body.images : [];
  }

  if (Object.keys(dto).length === 0) throw new AppError(400, '没有需要更新的字段');
  return dto;
}

function diaryIdDTO(params) {
  const id = parseInt(params.id);
  if (isNaN(id) || id <= 0) throw new AppError(400, '日记ID无效');
  return id;
}

module.exports = { createDiaryDTO, updateDiaryDTO, diaryIdDTO };
