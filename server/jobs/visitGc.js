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

// 定时执行入口（注册表调用；先聚合成功才轮到本任务清理，见 jobs/index.js 的依赖声明）
async function runVisitGc() {
  try {
    await cleanupOldVisitLogs();
    return true;
  } catch (err) {
    console.error('[visit-gc] 失败:', err);
    return false;
  }
}

module.exports = { cleanupOldVisitLogs, runVisitGc, RETENTION_DAYS };
