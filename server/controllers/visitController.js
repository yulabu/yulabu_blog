const { fn, col } = require('sequelize');
const AppError = require('@middleware/AppError');
const { recordVisitDTO, listVisitsDTO } = require('@dto/visit.dto');
const { VisitLog, Post } = require('@models');
const { visitLogsVO, visitStatsVO } = require('@vo/visit.vo');
const { Op } = require('sequelize');

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
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 今日 PV
  const todayPV = await VisitLog.count({
    where: { created_at: { [Op.gte]: todayStart } }
  });

  // 今日 UV（去重 IP）
  const todayUVResult = await VisitLog.findAll({
    attributes: [[fn('COUNT', fn('DISTINCT', col('ip_address'))), 'uv']],
    where: { created_at: { [Op.gte]: todayStart } },
    plain: true
  });
  const todayUV = todayUVResult ? Number(todayUVResult.get('uv')) : 0;

  // 总 PV
  const totalPV = await VisitLog.count();

  // 总 UV
  const totalUVResult = await VisitLog.findAll({
    attributes: [[fn('COUNT', fn('DISTINCT', col('ip_address'))), 'uv']],
    plain: true
  });
  const totalUV = totalUVResult ? Number(totalUVResult.get('uv')) : 0;

  res.json(visitStatsVO({ todayPV, todayUV, totalPV, totalUV }));
};

// ========== 管理后台：清空全部日志 ==========
exports.clearAllVisits = async (req, res) => {
  const count = await VisitLog.count();
  await VisitLog.destroy({ where: {} });
  res.json({ message: `已清空 ${count} 条日志`, deletedCount: count });
};
