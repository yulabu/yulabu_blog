const { QueryTypes } = require('sequelize');
const { sequelize } = require('@config/database');
const { DailyStat } = require('@models');

// 从 visit_log 全量重算每日 PV/UV 并 UPSERT 到 daily_stat。
//
// 安全约束：只写日志中仍然存在的日期。超过保留期、原始日志已被 visitGc 删除的日期
// 不会出现在分组结果里，所以历史统计行永远不会被重算覆盖成 0。
// 因此不要为了「补齐空白天」而预生成 0 行 —— 那会破坏这条保证（图表本来就补零）。
//
// 幂等：全量重算，可重复执行；服务停机漏跑后一次运行即自愈。
async function aggregateDailyStats() {
  const rows = await sequelize.query(
    `SELECT DATE(created_at) AS date,
            COUNT(*) AS pv,
            COUNT(DISTINCT ip_address) AS uv
       FROM visit_log
      GROUP BY DATE(created_at)`,
    { type: QueryTypes.SELECT }
  );

  if (!rows.length) return 0;

  await DailyStat.bulkCreate(
    rows.map(r => ({
      stat_date: String(r.date).slice(0, 10),
      pv: Number(r.pv) || 0,
      uv: Number(r.uv) || 0
    })),
    { updateOnDuplicate: ['pv', 'uv'] }
  );

  return rows.length;
}

// 定时执行入口（注册表调用）：任务自己的进度/失败日志在这里，失败不抛出——
// 失败隔离由注册表保证（一个任务挂了不影响别的任务与 HTTP 服务），成功与否用返回值表达（供依赖方判断）
async function runDailyStat() {
  try {
    const days = await aggregateDailyStats();
    if (days) console.log(`[daily-stat] 已聚合 ${days} 天`);
    return true;
  } catch (err) {
    console.error('[daily-stat] 失败:', err);
    return false;
  }
}

module.exports = { aggregateDailyStats, runDailyStat };
