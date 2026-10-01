// 访问统计：本层只做「取参（DTO）→ 调 service → 组装 vo」。
// 记录要写两张表（明细 + 文章 PV）必须原子、统计是聚合查询——都按判据进 services/visit.js。
const { recordVisitDTO, listVisitsDTO } = require('@dto/visit.dto');
const { visitLogsVO, visitStatsVO } = require('@vo/visit.vo');
const visit = require('@services/visit');

// ========== 记录访问（公开接口，前端文章页 fire-and-forget 调用） ==========
exports.recordVisit = async (req, res) => {
  const { post_id, page_path } = recordVisitDTO(req.body);

  await visit.record({
    postId: post_id,
    ip: req.ip,
    userAgent: (req.headers['user-agent'] || '').slice(0, 512),
    referrer: (req.headers['referer'] || req.headers['referrer'] || '').slice(0, 512),
    pagePath: page_path
  });

  res.json({ message: '已记录' });
};

// ========== 管理后台：分页查询访问日志 ==========
exports.getVisits = async (req, res) => {
  const { page, limit, offset, startOffsetDays, ip, post_id } = listVisitsDTO(req.query);

  const { rows, total } = await visit.list({ limit, offset, startOffsetDays, ip, post_id });

  res.json({
    visits: visitLogsVO(rows),
    total,
    page,
    totalPages: Math.ceil(total / limit)
  });
};

// ========== 管理后台：访问统计概览 ==========
exports.getVisitStats = async (req, res) => {
  res.json(visitStatsVO(await visit.stats()));
};

// ========== 管理后台：清空全部日志 ==========
exports.clearAllVisits = async (req, res) => {
  const count = await visit.clear();
  res.json({ count, message: `已清空 ${count} 条日志` });
};
