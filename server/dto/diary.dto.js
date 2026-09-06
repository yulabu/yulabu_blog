const AppError = require('@middleware/AppError');

// 日记单图契约：images 最多 1 张（images[0] 即封面，与 cover_image_id 一一对应）。
// 超出必须报错而非静默截断——静默丢弃会让多出的图片变成无指针孤儿被 GC 回收
function validDiaryImages(images) {
  if (!Array.isArray(images)) throw new AppError(400, 'images 必须是数组');
  if (images.length > 1) throw new AppError(400, '日记最多支持1张图片');
  return images;
}

function createDiaryDTO(body) {
  const content = body.content?.trim();

  if (!content) throw new AppError(400, '日记内容不能为空');
  if (content.length > 3000) throw new AppError(400, '日记内容不能超过3000个字符');

  const dto = { content };

  if (body.images !== undefined) {
    dto.images = validDiaryImages(body.images);
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
    dto.images = validDiaryImages(body.images);
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
