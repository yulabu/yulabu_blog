require('module-alias/register');
require('dotenv').config();
const { VisitLog } = require('@models');
const { Op } = require('sequelize');

const RETENTION_DAYS = 90;

async function cleanupOldVisitLogs() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
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
