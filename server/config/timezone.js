// 北京时间（UTC+8）的唯一事实：小时数只在这里写一次，其余全部派生。
// 两个消费者必须永远一致，否则会出现「图表日期与 DB 分组差一天」这类事故（visitGc 半截日实修过）：
//   - config/database.js 的 Sequelize timezone（DATETIME 列按 +08:00 存墙钟）
//   - utils/date.js 的偏移量（应用层算北京日期）→ utils/log.js 的日志时间戳
const OFFSET_HOURS = 8

// '+08:00'：Sequelize 的 timezone 选项与 JS Date 字符串都接受的形式
const TZ_OFFSET = `${OFFSET_HOURS < 0 ? '-' : '+'}${String(Math.abs(OFFSET_HOURS)).padStart(2, '0')}:00`

const OFFSET_MS = OFFSET_HOURS * 60 * 60 * 1000

module.exports = { OFFSET_HOURS, TZ_OFFSET, OFFSET_MS }
