// 工作台图表窗口的入参白名单（它是「外面能传什么」的约束，属 DTO，不是业务策略常量）。
// 前端当前只用 7/30 天；90/365 留给后续前端接入，后端先具备能力。
// 改前这段表写在 controllers/adminController.js 里且控制器直读 req.query.range。
const CHART_RANGE_DAYS = { '7days': 7, '30days': 30, '90days': 90, '365days': 365 };

// 非法/缺省一律回落到 7 天（与改前 `CHART_RANGE_DAYS[range] || 7` 行为一致）
function chartRangeDTO(query) {
  const range = query.range;
  const days = CHART_RANGE_DAYS[range];
  return days ? { range, days } : { range: '7days', days: 7 };
}

module.exports = { chartRangeDTO, CHART_RANGE_DAYS };
