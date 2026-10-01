// 工作台：卡片统计与图表。聚合/分组 SQL 都在 services/dashboard.js（判据①），
// 这一层只做「取参（DTO）→ 调 service → 组装 vo（recentPosts 转列表项）」。
const { postSummary } = require('@vo/post.vo');
const { chartRangeDTO } = require('@dto/dashboard.dto');
const { getStats, getCharts } = require('@services/dashboard');

// 工作台统计数据
exports.getDashboard = async (req, res) => {
  const stats = await getStats();

  res.json({
    todayCount: stats.todayCount,
    totalCount: stats.totalCount,
    publishedCount: stats.publishedCount,
    trashCount: stats.trashCount,
    recentPosts: stats.recentPosts.map(postSummary)
  });
};

// 工作台图表数据：发文趋势、访问趋势、标签分布（窗口天数由 DTO 白名单给出）
exports.getDashboardCharts = async (req, res) => {
  const { days } = chartRangeDTO(req.query);
  res.json(await getCharts(days));
};
