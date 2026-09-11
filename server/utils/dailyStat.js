require('module-alias/register');
require('dotenv').config();
const { QueryTypes } = require('sequelize');
const sequelize = require('@config/database');
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

module.exports = { aggregateDailyStats };

// 支持直接运行：node utils/dailyStat.js
if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      const days = await aggregateDailyStats();
      console.log(`[daily-stat] 完成，聚合 ${days} 天`);
      await sequelize.close();
    } catch (e) {
      console.error('[daily-stat] 失败:', e.message);
      process.exit(1);
    }
  })();
}
