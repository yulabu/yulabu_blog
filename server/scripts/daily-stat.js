require('module-alias/register');
require('dotenv').config();
const { sequelize } = require('@config/database');
const { aggregateDailyStats } = require('@jobs/dailyStat');

// 每日统计聚合的手工入口（改前是 node utils/dailyStat.js）：
// 从 visit_log 全量重算 daily_stat。幂等，可反复执行；服务停机漏跑后跑一次即自愈。
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
