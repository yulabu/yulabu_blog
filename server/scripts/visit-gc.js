require('module-alias/register');
require('dotenv').config({ quiet: true });
const { sequelize } = require('@config/database');
const { cleanupOldVisitLogs, RETENTION_DAYS } = require('@jobs/visitGc');

// 访问日志清理的手工入口（改前是 node utils/visitGc.js）：
// 按北京自然日裁掉保留期之外的明细。**先跑 scripts/daily-stat.js**——常驻任务里清理
// 只会在聚合成功之后执行，手工清理时跳过聚合可能让最老一天只统计到半截（见 AGENTS「三条不变式」）。
if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      const count = await cleanupOldVisitLogs();
      console.log(`[visit-gc] 完成，清理 ${count} 条（保留 ${RETENTION_DAYS} 天）`);
      await sequelize.close();
    } catch (e) {
      console.error('[visit-gc] 失败:', e.message);
      process.exit(1);
    }
  })();
}
