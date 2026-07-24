function noticeDetail(notice) {
  return {
    notice_id: notice.notice_id,
    notice_title: notice.notice_title,
    notice_content: notice.notice_content,
    notice_status: notice.notice_status,
    notice_is_pinned: notice.notice_is_pinned,
    notice_created_at: notice.createdAt,
  };
}

function noticeList(notices) {
  return notices.map(notice => noticeDetail(notice));
}

module.exports = { noticeDetail, noticeList };
