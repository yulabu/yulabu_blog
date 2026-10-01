// 访问统计域的服务层：记录 / 列表 / 统计 / 清空。
//
// 判据②：record 一次请求写两张表（visit_log + post.view_count），必须原子——
// 改前是两次独立写，任一步失败会留下「有访问无计数」或「有计数无访问」的偏差。
const { Op, fn, col } = require('sequelize');
const { sequelize, VisitLog, Post, DailyStat } = require('@models');
const { beijingDateStr, shiftDateStr, beijingDayStart } = require('@utils/date');

// 记录一次访问：写明细 + 文章页 PV+1，同一事务
async function record({ postId, ip, userAgent, referrer, pagePath }) {
  await sequelize.transaction(async (t) => {
    await VisitLog.create({
      post_id: postId,
      ip_address: ip,
      user_agent: userAgent,
      referrer,
      page_path: pagePath
    }, { transaction: t });

    if (postId) {
      await Post.increment('view_count', { where: { post_id: postId }, transaction: t });
    }
  });
}

// 明细列表（分页 + 时间窗 + ip / 文章过滤）；startOffsetDays 由 listVisitsDTO 给出
// （null / undefined = 不加时间条件，即 all）。值→偏移的映射与白名单同处 dto 一层（判据：值驱动行为）
async function list({ limit, offset, startOffsetDays, ip, post_id }) {
  const where = {};
  if (startOffsetDays !== null && startOffsetDays !== undefined) {
    where.created_at = { [Op.gte]: beijingDayStart(shiftDateStr(beijingDateStr(), startOffsetDays)) };
  }
  if (ip) where.ip_address = { [Op.like]: `%${ip}%` };
  if (post_id) where.post_id = post_id;

  const { rows, count } = await VisitLog.findAndCountAll({
    where,
    include: { model: Post, as: 'Post', attributes: ['post_id', 'post_title'] },
    order: [['created_at', 'DESC']],
    limit,
    offset
  });
  return { rows, total: count };
}

// 统计概览：今日读原始日志（实时、永远在保留期内），总量读 daily_stat（永久、不随清理缩水）
async function stats() {
  const todayStart = beijingDayStart(beijingDateStr());

  const todayPV = await VisitLog.count({
    where: { created_at: { [Op.gte]: todayStart } }
  });

  const todayUVResult = await VisitLog.findAll({
    attributes: [[fn('COUNT', fn('DISTINCT', col('ip_address'))), 'uv']],
    where: { created_at: { [Op.gte]: todayStart } },
    plain: true
  });
  const todayUV = todayUVResult ? Number(todayUVResult.get('uv')) : 0;

  // totalUV 是各日去重 UV 之和：长期访客会被逐日重复计入（口径偏大但永不缩水）
  const totalPV = Number(await DailyStat.sum('pv')) || 0;
  const totalUV = Number(await DailyStat.sum('uv')) || 0;

  return { todayPV, todayUV, totalPV, totalUV };
}

// 清空明细；daily_stat 已归档的每日统计与总量不受影响（要重置历史统计须手工清 daily_stat）
async function clear() {
  const count = await VisitLog.count();
  await VisitLog.destroy({ where: {} });
  return count;
}

module.exports = { record, list, stats, clear };
