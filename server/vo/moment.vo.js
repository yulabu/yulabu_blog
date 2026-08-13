function momentDetail(moment) {
  return {
    id: moment.moment_id,
    content: moment.moment_content,
    image: moment.moment_image || null,
    status: moment.moment_status,
    created_at: moment.created_at,
    updated_at: moment.updated_at
  };
}

function momentList(moments) {
  return moments.map(momentDetail);
}

module.exports = { momentDetail, momentList };
