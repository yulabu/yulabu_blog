const AppError = require('../middleware/AppError');
const { Notice } = require('../models');
const { noticeIdDTO, createNoticeDTO, updateNoticeDTO } = require('../dto/notice.dto');
const { noticeDetail, noticeList } = require('../vo/notice.vo');

// 公开接口：获取 show 状态的公告，置顶优先
exports.getPublicNotices = async (req, res) => {
  const notices = await Notice.findAll({
    where: { notice_status: 'show' },
    order: [
      ['notice_is_pinned', 'DESC'],
      ['created_at', 'DESC']
    ]
  });
  res.json({ notices: noticeList(notices) });
};

// 管理后台：获取所有公告
exports.getAdminNotices = async (req, res) => {
  const notices = await Notice.findAll({
    order: [
      ['notice_is_pinned', 'DESC'],
      ['created_at', 'DESC']
    ]
  });
  res.json({ notices: noticeList(notices) });
};

// 单条公告详情
exports.getNoticeById = async (req, res) => {
  const noticeId = noticeIdDTO(req.params);
  const notice = await Notice.findByPk(noticeId);
  if (!notice) throw new AppError(404, '公告不存在');
  res.json(noticeDetail(notice));
};

// 创建公告
exports.createNotice = async (req, res) => {
  const data = createNoticeDTO(req.body);
  const notice = await Notice.create(data);
  res.status(201).json({ notice_id: notice.notice_id, message: '创建成功' });
};

// 编辑公告
exports.updateNotice = async (req, res) => {
  const noticeId = noticeIdDTO(req.params);
  const notice = await Notice.findByPk(noticeId);
  if (!notice) throw new AppError(404, '公告不存在');

  const data = updateNoticeDTO(req.body);
  await notice.update(data);
  res.json({ notice_id: notice.notice_id, message: '更新成功' });
};

// 删除公告
exports.deleteNotice = async (req, res) => {
  const noticeId = noticeIdDTO(req.params);
  const notice = await Notice.findByPk(noticeId);
  if (!notice) throw new AppError(404, '公告不存在');

  await notice.destroy();
  res.json({ message: '删除成功' });
};

// 切换置顶状态
exports.togglePin = async (req, res) => {
  const noticeId = noticeIdDTO(req.params);
  const notice = await Notice.findByPk(noticeId);
  if (!notice) throw new AppError(404, '公告不存在');

  await notice.update({ notice_is_pinned: !notice.notice_is_pinned });
  res.json({
    notice_id: notice.notice_id,
    notice_is_pinned: notice.notice_is_pinned,
    message: notice.notice_is_pinned ? '已置顶' : '已取消置顶'
  });
};
