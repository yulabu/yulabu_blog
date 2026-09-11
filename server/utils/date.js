// 北京时间（UTC+8）日界工具：后端判定「今天是哪一天」的唯一入口。
// 库里 DATETIME 按 config/database.js 的 timezone '+08:00' 存的是北京墙钟时间，
// 所以 DATE(created_at) 分组得到的就是北京日期；而进程时区可能是 UTC（生产 Debian 默认），
// 直接用 new Date().setHours(0,0,0,0) 取「今天」，会在北京时间 00:00–08:00 与 DB 分组错开一天。
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

// 指定时刻（默认当前）对应的北京日期串 YYYY-MM-DD
function beijingDateStr(date = new Date()) {
  return new Date(date.getTime() + BEIJING_OFFSET_MS).toISOString().slice(0, 10);
}

// 日期串加减天数（基于 UTC 算术，不依赖进程时区）
function shiftDateStr(dateStr, days) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// 北京时间某天零点对应的 Date（与 DB timezone '+08:00' 对齐，供 Sequelize 查询边界使用）
function beijingDayStart(dateStr) {
  return new Date(`${dateStr}T00:00:00+08:00`);
}

module.exports = { BEIJING_OFFSET_MS, beijingDateStr, shiftDateStr, beijingDayStart };
