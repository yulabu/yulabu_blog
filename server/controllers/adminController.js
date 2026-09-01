const { Op, fn, col } = require('sequelize');
const { Post, Tag, VisitLog } = require('@models');
const { postSummary } = require('@vo/post.vo');

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
  const range = req.query.range === '30days' ? 30 : 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - range + 1);

  const formatDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 生成日期序列（含今天）
  const dateSeq = [];
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    dateSeq.push(formatDateStr(d));
  }

  // 按天发文数（仅已发布）
  const postRows = await Post.findAll({
    attributes: [
      [fn('DATE', col('created_at')), 'date'],
      [fn('COUNT', col('post_id')), 'count']
    ],
    where: {
      post_status: 'published',
      created_at: { [Op.gte]: startDate, [Op.lt]: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    },
    group: [fn('DATE', col('created_at'))],
    raw: true
  });
  const postMap = new Map(postRows.map(r => [r.date, Number(r.count)]));
  const postsByDate = dateSeq.map(date => ({ date, count: postMap.get(date) || 0 }));

  // 按天访问 PV / UV
  const visitRows = await VisitLog.findAll({
    attributes: [
      [fn('DATE', col('created_at')), 'date'],
      [fn('COUNT', col('visit_id')), 'pv'],
      [fn('COUNT', fn('DISTINCT', col('ip_address'))), 'uv']
    ],
    where: {
      created_at: { [Op.gte]: startDate, [Op.lt]: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    },
    group: [fn('DATE', col('created_at'))],
    raw: true
  });
  const visitMap = new Map(visitRows.map(r => [r.date, { pv: Number(r.pv), uv: Number(r.uv) }]));
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