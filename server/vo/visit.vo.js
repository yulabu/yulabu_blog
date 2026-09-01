function visitLogVO(visit) {
  const post = visit.Post || visit.post || null;
  return {
    id: visit.visit_id,
    postId: visit.post_id,
    postTitle: post ? post.post_title : null,
    ip: visit.ip_address,
    userAgent: visit.user_agent || null,
    referrer: visit.referrer || null,
    path: visit.page_path,
    createdAt: visit.createdAt
  };
}

function visitLogsVO(visits) {
  return visits.map(visitLogVO);
}

function visitStatsVO({ todayPV, todayUV, totalPV, totalUV }) {
  return { todayPV, todayUV, totalPV, totalUV };
}

module.exports = { visitLogVO, visitLogsVO, visitStatsVO };
