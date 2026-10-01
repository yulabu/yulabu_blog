const AppError = require('@errors/AppError');
const { FriendLink } = require('@models');
const { createFriendLinkDTO, updateFriendLinkDTO, friendLinkIdDTO } = require('@dto/friendLink.dto');
const { friendLinkDetail, friendLinkList, previewResultVO } = require('@vo/friendLink.vo');
// 抓图的合并规则（覆盖谁/只填谁/截断）在 services/friendLink.js（判据④领域派生）；
// 出站加固在 services/ogImage.js。controller 只做 取参 → 调 service → 组装 vo
const { applyPreview } = require('@services/friendLink');

exports.getPublicLinks = async (req, res) => {
  const links = await FriendLink.findAll({
    where: { status: 'show' },
    order: [['sort_order', 'ASC']]
  });
  res.json(friendLinkList(links));
};

exports.getAdminLinks = async (req, res) => {
  const links = await FriendLink.findAll({
    order: [['sort_order', 'ASC']]
  });
  res.json(friendLinkList(links));
};

exports.getLinkById = async (req, res) => {
  const id = friendLinkIdDTO(req.params);
  const link = await FriendLink.findByPk(id);
  if (!link) throw new AppError(404, '友链不存在');
  res.json(friendLinkDetail(link));
};

exports.createLink = async (req, res) => {
  const data = createFriendLinkDTO(req.body);
  const link = await FriendLink.create(data);
  res.status(201).json({ id: link.friend_link_id, message: '创建成功' });
};

exports.updateLink = async (req, res) => {
  const id = friendLinkIdDTO(req.params);
  const link = await FriendLink.findByPk(id);
  if (!link) throw new AppError(404, '友链不存在');
  const data = updateFriendLinkDTO(req.body);
  await link.update(data);
  res.json({ id: link.friend_link_id, message: '更新成功' });
};

exports.deleteLink = async (req, res) => {
  const id = friendLinkIdDTO(req.params);
  const link = await FriendLink.findByPk(id);
  if (!link) throw new AppError(404, '友链不存在');

  // 友链不持任何图片引用（头像/背景均外链），直接删行即可
  await link.destroy();

  res.json({ id: link.friend_link_id, message: '删除成功' });
};

// 抓取友链图片（全外链，不落盘）：og:image → 背景图覆盖写（是刷新背景的手段）；
// favicon → 头像仅空时填（手填的不覆盖，清空后可重抓）。皆无则不动数据。
// 合并规则与截断在 services/friendLink.js，响应文案在 vo 的 previewResultVO
exports.fetchPreview = async (req, res) => {
  const id = friendLinkIdDTO(req.params);
  const link = await FriendLink.findByPk(id);
  if (!link) throw new AppError(404, '友链不存在');

  res.json(previewResultVO(await applyPreview(link)));
};