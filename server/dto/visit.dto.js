const AppError = require('@errors/AppError');
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
// 时间窗的「值 → 北京自然日偏移」与白名单**同处一层**（判据：一个值要驱动行为，值与行为不许分居两层）。
// 改前白名单在这里、偏移表在 services/visit.js：给白名单加一个窗口（如 90days）而不改另一处，
// service 取不到偏移就会静默退化成「不加时间条件、返回全部日志」。
// 口径与工作台图表、「今日 PV/UV」卡、visitGc 的保留期同源：都是北京自然日（相对今天偏移）。
// today = 含今天 1 天，7days = 含今天 7 天；映射里没有的键（含 'all' 与非法值）一律 null = 不加时间条件。
const RANGE_START_OFFSET_DAYS = {
  today: 0,
  '7days': -6,
  '30days': -29
};

function listVisitsDTO(query) {
  const { page, limit, offset } = paginate(query);

  const startOffsetDays = RANGE_START_OFFSET_DAYS[query.dateRange] ?? null;

  const ip = (query.ip || '').trim().slice(0, 45) || null;

  const post_id = query.post_id ? Number(query.post_id) : null;
  if (post_id !== null && (isNaN(post_id) || post_id < 1)) {
    throw new AppError(400, '无效的文章ID');
  }

  return { page, limit, offset, startOffsetDays, ip, post_id };
}

module.exports = { recordVisitDTO, listVisitsDTO };
