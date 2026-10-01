// 工作台域的服务层：卡片统计与图表聚合（判据①：分组/聚合 SQL 必须进 services）。
//
// 时间口径一律走 utils/date 的北京自然日——**卡片与图表必须同源**（改前卡片用进程本地零点、
// 图表用北京自然日，UTC 进程下同一天的两个数字能差 8 小时窗口，实修过）。
const { Op, fn, col } = require('sequelize');
const { Post, Tag, DailyStat } = require('@models');
const { beijingDateStr, shiftDateStr, beijingDayStart } = require('@utils/date');

// 卡片：文章总数 / 已发布 / 回收站 / 今日新增 / 最近 5 篇（原始模型行，vo 组装在控制器）
async function getStats() {
  const [totalCount, publishedCount, trashCount] = await Promise.all([
    Post.count(),
    Post.count({ where: { post_status: 'published' } }),
    Post.count({ where: { post_status: 'trash' } })
  ]);

  const todayCount = await Post.count({
    where: {
      post_status: 'published',
      created_at: { [Op.gte]: beijingDayStart(beijingDateStr()) }
    }
  });

  const recentPosts = await Post.findAll({
    where: { post_status: 'published' },
    include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name'] },
    order: [['created_at', 'DESC']],
    limit: 5
  });

  return { totalCount, publishedCount, trashCount, todayCount, recentPosts };
}

// 图表：发文趋势（按北京自然日分组）+ 访问趋势（读 daily_stat，与 90 天日志清理解耦）+ 标签分布。
// 窗口长度由 DTO 校验后传入（dto/dashboard.dto.js 的白名单）
async function getCharts(days) {
  const todayStr = beijingDateStr();
  const startDateStr = shiftDateStr(todayStr, -(days - 1));
  const startDate = beijingDayStart(startDateStr);
  const endExclusive = beijingDayStart(shiftDateStr(todayStr, 1));

  // 日期序列（含今天）：没有数据的日期补 0，前端图表不必自己补
  const dateSeq = [];
  for (let d = startDateStr; d <= todayStr; d = shiftDateStr(d, 1)) {
    dateSeq.push(d);
  }

  const postRows = await Post.findAll({
    attributes: [
      [fn('DATE', col('created_at')), 'date'],
      [fn('COUNT', col('post_id')), 'count']
    ],
    where: {
      post_status: 'published',
      created_at: { [Op.gte]: startDate, [Op.lt]: endExclusive }
    },
    group: [fn('DATE', col('created_at'))],
    raw: true
  });
  const postMap = new Map(postRows.map(r => [String(r.date).slice(0, 10), Number(r.count)]));
  const postsByDate = dateSeq.map(date => ({ date, count: postMap.get(date) || 0 }));

  const visitRows = await DailyStat.findAll({
    attributes: ['stat_date', 'pv', 'uv'],
    where: { stat_date: { [Op.between]: [startDateStr, todayStr] } },
    raw: true
  });
  const visitMap = new Map(visitRows.map(r => [
    String(r.stat_date).slice(0, 10),
    { pv: Number(r.pv), uv: Number(r.uv) }
  ]));
  const visitsByDate = dateSeq.map(date => {
    const v = visitMap.get(date) || { pv: 0, uv: 0 };
    return { date, pv: v.pv, uv: v.uv };
  });

  const tagRows = await Tag.findAll({
    attributes: [
      'tag_id',
      'tag_name',
      [fn('COUNT', col('posts.post_id')), 'count']
    ],
    include: [{
      model: Post,
      as: 'posts',
      where: { post_status: 'published' },
      attributes: [],
      required: false
    }],
    group: ['Tag.tag_id', 'Tag.tag_name'],
    raw: true
  });
  const tagsDistribution = tagRows
    .map(r => ({ name: r.tag_name, value: Number(r.count) || 0 }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value);

  return { postsByDate, visitsByDate, tagsDistribution };
}

module.exports = { getStats, getCharts };
