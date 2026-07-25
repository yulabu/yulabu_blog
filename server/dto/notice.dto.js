const AppError = require('@middleware/AppError');

function noticeIdDTO(params) {
  const id = Number(params.id);
  if (!id || id < 1) throw new AppError(400, '无效的公告ID');
  return id;
}

function createNoticeDTO(body) {
  const title = body.notice_title?.trim();
  const content = body.notice_content?.trim();
  const status = body.notice_status;
  const isPinned = body.notice_is_pinned;

  if (!title) throw new AppError(400, '公告标题不能为空');
  if (title.length > 32) throw new AppError(400, '公告标题不能超过32个字符');
  if (!content) throw new AppError(400, '公告内容不能为空');

  const dto = {
    notice_title: title,
    notice_content: content,
  };

  if (status !== undefined) {
    if (!['show', 'hide'].includes(status)) {
      throw new AppError(400, '公告状态只能是 show 或 hide');
    }
    dto.notice_status = status;
  }

  if (isPinned !== undefined) {
    dto.notice_is_pinned = !!isPinned;
  }

  return dto;
}

function updateNoticeDTO(body) {
  const dto = {};

  if (body.notice_title !== undefined) {
    const title = body.notice_title.trim();
    if (!title) throw new AppError(400, '公告标题不能为空');
    if (title.length > 32) throw new AppError(400, '公告标题不能超过32个字符');
    dto.notice_title = title;
  }

  if (body.notice_content !== undefined) {
    const content = body.notice_content.trim();
    if (!content) throw new AppError(400, '公告内容不能为空');
    dto.notice_content = content;
  }

  if (body.notice_status !== undefined) {
    if (!['show', 'hide'].includes(body.notice_status)) {
      throw new AppError(400, '公告状态只能是 show 或 hide');
    }
    dto.notice_status = body.notice_status;
  }

  if (body.notice_is_pinned !== undefined) {
    dto.notice_is_pinned = !!body.notice_is_pinned;
  }

  if (Object.keys(dto).length === 0) {
    throw new AppError(400, '没有需要更新的字段');
  }

  return dto;
}

module.exports = { noticeIdDTO, createNoticeDTO, updateNoticeDTO };
