const AppError = require('@middleware/AppError');
const { parseId, paginate } = require('./common.dto');

// ========== 创建文章 ==========
// draft 状态下允许空标题/正文（ensureDraft 延迟建草稿），发布必须完整
function createPostDTO(body) {
  const isDraft = body.post_status === 'draft';
  const title = body.post_title?.trim();
  const content = body.post_content;

  if (!isDraft) {
    if (!title) throw new AppError(400, '标题不能为空');
    if (title.length > 32) throw new AppError(400, '标题不能超过32个字符');
    if (!content) throw new AppError(400, '正文不能为空');
  } else if (title && title.length > 32) {
    throw new AppError(400, '标题不能超过32个字符');
  }

  return {
    post_title: title || '未命名草稿',
    post_content: content || '',
    post_summary: (body.post_summary || '').trim().slice(0, 128) || null,
    post_author: (body.post_author || '').trim() || '匿名',
    post_category_id: body.post_category_id ? Number(body.post_category_id) : null,
    post_cover: normalizeCover(body.post_cover),
    post_status: isDraft ? 'draft' : 'published', // 仅允许 draft / published，外部不可直接置 trash
  };
}

// 封面 URL 校验：undefined/null 不动（null 为前端无封面时的显式值），trim，空串转 null，≤512
function normalizeCover(value) {
  if (value === undefined || value === null) return null;
  const cover = value.trim();
  if (cover.length > 512) throw new AppError(400, '封面图URL不能超过512个字符');
  return cover || null;
}

// ========== 更新文章 ==========
function updatePostDTO(body) {
  const dto = {};

  if (body.post_title !== undefined) {
    const title = body.post_title.trim();
    if (!title && body.post_status !== 'draft') throw new AppError(400, '标题不能为空');
    if (title.length > 32) throw new AppError(400, '标题不能超过32个字符');
    // draft 状态空标题保持默认名（与 createPostDTO 一致）
    dto.post_title = title || '未命名草稿';
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

  if (body.post_cover !== undefined) {
    dto.post_cover = normalizeCover(body.post_cover);
  }

  if (body.post_author !== undefined) {
    const raw = (body.post_author || '').trim();
    if (raw.length > 16) throw new AppError(400, '作者名不能超过16个字符');
    dto.post_author = raw || '匿名';
  }

  // 允许在 published / trash / draft 之间切换
  if (body.post_status === 'published' || body.post_status === 'trash' || body.post_status === 'draft') {
    dto.post_status = body.post_status;
  }

  if (Object.keys(dto).length === 0) {
    throw new AppError(400, '没有需要更新的字段');
  }

  return dto;
}

// ========== 列表分页 ==========
function listPostsDTO(query) {
  const { page, limit, offset } = paginate(query);
  const category_id = query.category_id ? Number(query.category_id) : null;
  const q = (query.q || '').trim().slice(0, 32) || null;
  if (category_id !== null && category_id < 1) throw new AppError(400, '无效的分类ID');
  return { page, limit, offset, category_id, q };
}

// ========== 文章ID ==========
function postIdDTO(params) {
  return parseId(params, '文章');
}

module.exports = { createPostDTO, updatePostDTO, listPostsDTO, postIdDTO };