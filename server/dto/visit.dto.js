const AppError = require('@middleware/AppError');
const { paginate } = require('./common.dto');

// ========== 记录访问 ==========
function recordVisitDTO(body) {
  const post_id = body.post_id ? Number(body.post_id) : null;
  if (post_id !== null && (isNaN(post_id) || post_id < 1)) {
    throw new AppError(400, '无效的文章ID');
  }

  const page_path = (body.page_path || '').trim();
  if (!page_path) throw new AppError(400, 'page_path 不能为空');
  if (page_path.length > 256) throw new AppError(400, 'page_path 不能超过256个字符');

  return { post_id, page_path };
}

// ========== 列表查询 ==========
function listVisitsDTO(query) {
  const { page, limit, offset } = paginate(query);

  const validRanges = ['today', '7days', '30days', 'all'];
  const dateRange = validRanges.includes(query.dateRange) ? query.dateRange : 'all';

  const ip = (query.ip || '').trim().slice(0, 45) || null;

  const post_id = query.post_id ? Number(query.post_id) : null;
  if (post_id !== null && (isNaN(post_id) || post_id < 1)) {
    throw new AppError(400, '无效的文章ID');
  }

  return { page, limit, offset, dateRange, ip, post_id };
}

module.exports = { recordVisitDTO, listVisitsDTO };
