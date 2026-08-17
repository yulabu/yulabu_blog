function momentDetail(moment) {
  return {
    id: moment.moment_id,
    content: moment.moment_content,
    image: moment.moment_image || null,
    status: moment.moment_status,
    created_at: moment.createdAt,
    updated_at: moment.updatedAt
  };
}

function momentList(moments) {
  return moments.map(momentDetail);
}

module.exports = { momentDetail, momentList };
