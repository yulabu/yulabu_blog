const { fn, col } = require('sequelize');
const AppError = require('@middleware/AppError');
const { recordVisitDTO, listVisitsDTO } = require('@dto/visit.dto');
const { VisitLog, Post, DailyStat } = require('@models');
const { visitLogsVO, visitStatsVO } = require('@vo/visit.vo');
const { Op } = require('sequelize');
const { beijingDateStr, beijingDayStart } = require('@utils/date');

// ========== 记录访问（公开接口，前端文章页 fire-and-forget 调用） ==========
exports.recordVisit = async (req, res) => {
  const { post_id, page_path } = recordVisitDTO(req.body);

  // 获取访客信息
  const ip_address = req.ip;
  const user_agent = (req.headers['user-agent'] || '').slice(0, 512);
  const referrer = (req.headers['referer'] || req.headers['referrer'] || '').slice(0, 512);

  // 写入访问日志
  await VisitLog.create({ post_id, ip_address, user_agent, referrer, page_path });

  // 如果是文章页，PV +1
  if (post_id) {
    await Post.increment('view_count', { where: { post_id } });
  }

  res.json({ message: 'ok' });
};

// ========== 管理后台：分页查询访问日志 ==========
exports.getVisits = async (req, res) => {
  const { page, limit, offset, dateRange, ip, post_id } = listVisitsDTO(req.query);

  // 构建时间范围条件
  const where = {};
  if (dateRange !== 'all') {
    const now = new Date();
    let cutoff;
    if (dateRange === 'today') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateRange === '7days') {
      cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === '30days') {
      cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    if (cutoff) where.created_at = { [Op.gte]: cutoff };
  }

  if (ip) where.ip_address = { [Op.like]: `%${ip}%` };
  if (post_id) where.post_id = post_id;

  const { rows: visits, count: total } = await VisitLog.findAndCountAll({
    where,
    include: { model: Post, as: 'Post', attributes: ['post_id', 'post_title'] },
    order: [['created_at', 'DESC']],
    limit,
    offset
  });

  res.json({
    visits: visitLogsVO(visits),
    total,
    page,
    totalPages: Math.ceil(total / limit)
  });
};

// ========== 管理后台：访问统计概览 ==========
exports.getVisitStats = async (req, res) => {
  // 今日零点按北京时间取（进程时区可能是 UTC，本地 setHours 会错位 8 小时）
  const todayStart = beijingDayStart(beijingDateStr());

  // 今日 PV / UV：读原始日志，实时且永远落在 90 天保留期内（无丢失风险）
  const todayPV = await VisitLog.count({
    where: { created_at: { [Op.gte]: todayStart } }
  });

  const todayUVResult = await VisitLog.findAll({
    attributes: [[fn('COUNT', fn('DISTINCT', col('ip_address'))), 'uv']],
    where: { created_at: { [Op.gte]: todayStart } },
    plain: true
  });
  const todayUV = todayUVResult ? Number(todayUVResult.get('uv')) : 0;

  // 总 PV / 总 UV：来自每日统计表（永久保留，不随 90 天清理缩水，也不受「清空日志」影响）
  // 注意 totalUV 是各日去重 UV 之和，长期访客会被逐日重复计入，口径偏大
  const totalPV = Number(await DailyStat.sum('pv')) || 0;
  const totalUV = Number(await DailyStat.sum('uv')) || 0;

  res.json(visitStatsVO({ todayPV, todayUV, totalPV, totalUV }));
};

// ========== 管理后台：清空全部日志 ==========
// 只删原始访问明细；daily_stat 已归档的每日统计与「总量」不受影响（需重置历史统计须手工清 daily_stat）
exports.clearAllVisits = async (req, res) => {
  const count = await VisitLog.count();
  await VisitLog.destroy({ where: {} });
  res.json({ message: `已清空 ${count} 条日志`, deletedCount: count });
};
