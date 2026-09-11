const { Op, fn, col } = require('sequelize');
const { Post, Tag, DailyStat } = require('@models');
const { postSummary } = require('@vo/post.vo');
const { beijingDateStr, shiftDateStr, beijingDayStart } = require('@utils/date');

// 图表窗口白名单（前端当前只用 7/30 天；90/365 留给后续前端接入，后端先具备能力）
const CHART_RANGE_DAYS = { '7days': 7, '30days': 30, '90days': 90, '365days': 365 };

// 工作台统计数据
exports.getDashboard = async (req, res) => {
  const total = await Post.count();
  const published = await Post.count({ where: { post_status: 'published' } });
  const trash = await Post.count({ where: { post_status: 'trash' } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await Post.count({
    where: {
      post_status: 'published',
      created_at: { [Op.gte]: today }
    }
  });

  const recentPosts = await Post.findAll({
    where: { post_status: 'published' },
    include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name'] },
    order: [['created_at', 'DESC']],
    limit: 5
  });

  res.json({
    todayCount,
    totalCount: total,
    publishedCount: published,
    trashCount: trash,
    recentPosts: recentPosts.map(postSummary)
  });
};

// 工作台图表数据：发文趋势、访问趋势、标签分布
exports.getDashboardCharts = async (req, res) => {
  const range = CHART_RANGE_DAYS[req.query.range] || 7;
  // 统一按北京自然日取窗口：进程时区可能是 UTC，不能用本地 setHours（否则与 DATE(created_at) 错开一天）
  const todayStr = beijingDateStr();
  const startDateStr = shiftDateStr(todayStr, -(range - 1));
  const startDate = beijingDayStart(startDateStr);
  const endExclusive = beijingDayStart(shiftDateStr(todayStr, 1));

  // 生成日期序列（含今天）
  const dateSeq = [];
  for (let d = startDateStr; d <= todayStr; d = shiftDateStr(d, 1)) {
    dateSeq.push(d);
  }

  // 按天发文数（仅已发布）
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

  // 按天访问 PV / UV：读每日统计表（与 90 天原始日志清理解耦，历史永不丢失）
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

  // 标签分布（仅已发布文章）
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

  res.json({ postsByDate, visitsByDate, tagsDistribution });
};