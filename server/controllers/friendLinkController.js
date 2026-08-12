const AppError = require('@middleware/AppError');
const { FriendLink } = require('@models');
const { createFriendLinkDTO, updateFriendLinkDTO, friendLinkIdDTO } = require('@dto/friendLink.dto');
const { friendLinkDetail, friendLinkList } = require('@vo/friendLink.vo');
const { fetchOgImage } = require('@utils/ogImage');

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
  await link.destroy();
  res.json({ id: link.friend_link_id, message: '删除成功' });
};

exports.fetchPreview = async (req, res) => {
  const id = friendLinkIdDTO(req.params);
  const link = await FriendLink.findByPk(id);
  if (!link) throw new AppError(404, '友链不存在');

  const previewImage = await fetchOgImage(link.url);
  await link.update({ preview_image: previewImage });

  if (previewImage) {
    res.json({ preview_image: previewImage, message: '预览图抓取成功' });
  } else {
    res.json({ preview_image: null, message: '未找到可用的预览图' });
  }
};
