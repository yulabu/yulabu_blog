require('module-alias/register');
require('dotenv').config();
const { VisitLog } = require('@models');
const { Op } = require('sequelize');
const { beijingDateStr, shiftDateStr, beijingDayStart } = require('@utils/date');

const RETENTION_DAYS = 90;

// 保留含今天在内的 RETENTION_DAYS 个完整自然日（北京时间）。
// 必须按自然日对齐：若沿用「now - 90d」的时间戳截断，最老一天会被切成半截，
// 而每日统计是全量重算，半截日会用不完整的数据覆盖掉已存的完整统计行 —— 历史被改小。
async function cleanupOldVisitLogs() {
  const cutoff = beijingDayStart(shiftDateStr(beijingDateStr(), -(RETENTION_DAYS - 1)));
  const deleted = await VisitLog.destroy({
    where: { created_at: { [Op.lt]: cutoff } }
  });
  if (deleted > 0) {
    console.log(`[visit-gc] 清理 ${deleted} 条过期访问日志`);
  }
  return deleted;
}

module.exports = { cleanupOldVisitLogs, RETENTION_DAYS };

// 支持直接运行：node utils/visitGc.js
if (require.main === module) {
  const sequelize = require('@config/database');
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
