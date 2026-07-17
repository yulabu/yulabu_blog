const AppError = require('../middleware/AppError');

// ========== 创建文章 ==========
function createPostDTO(body) {
  const title = body.post_title?.trim();
  const content = body.post_content;

  if (!title) throw new AppError(400, '标题不能为空');
  if (title.length > 32) throw new AppError(400, '标题不能超过32个字符');
  if (!content) throw new AppError(400, '正文不能为空');

  return {
    post_title: title,
    post_content: content,
    post_summary: (body.post_summary || '').trim().slice(0, 128) || null,
    post_author: (body.post_author || '').trim() || '匿名',
    post_category_id: body.post_category_id ? Number(body.post_category_id) : null,
    post_status: 'published', // 强制写死，外部不可控制
  };
}

// ========== 更新文章 ==========
function updatePostDTO(body) {
  const dto = {};

  if (body.post_title !== undefined) {
    const title = body.post_title.trim();
    if (!title) throw new AppError(400, '标题不能为空');
    if (title.length > 32) throw new AppError(400, '标题不能超过32个字符');
    dto.post_title = title;
  }

  if (body.post_content !== undefined) {
    dto.post_content = body.post_content;
  }

  if (body.post_summary !== undefined) {
    dto.post_summary = (body.post_summary || '').trim().slice(0, 128) || null;
  }

  if (body.post_category_id !== undefined) {
    dto.post_category_id = body.post_category_id ? Number(body.post_category_id) : null;
  }

  // 允许在 published 和 trash 之间切换
  if (body.post_status === 'published' || body.post_status === 'trash') {
    dto.post_status = body.post_status;
  }

  if (Object.keys(dto).length === 0) {
    throw new AppError(400, '没有需要更新的字段');
  }

  return dto;
}

// ========== 列表分页 ==========
function listPostsDTO(query) {
  const page = Math.min(1000, Math.max(parseInt(query.page) || 1, 1));
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
  const category_id = query.category_id ? Number(query.category_id) : null; // 查询是否有分类ID
  if (category_id !== null && category_id < 1) throw new AppError(400, '无效的分类ID');
  return { page, limit, category_id };
}

// ========== 文章ID ==========
function postIdDTO(params) {
  const id = Number(params.id);
  if (!id || id < 1) throw new AppError(400, '无效的文章ID');
  return id;
}

module.exports = { createPostDTO, updatePostDTO, listPostsDTO, postIdDTO };