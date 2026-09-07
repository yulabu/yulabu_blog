const AppError = require('@middleware/AppError');
const { FriendLink } = require('@models');
const { createFriendLinkDTO, updateFriendLinkDTO, friendLinkIdDTO } = require('@dto/friendLink.dto');
const { friendLinkDetail, friendLinkList } = require('@vo/friendLink.vo');
const { fetchOgMeta } = require('@utils/ogImage');

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) : str;
}

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
exports.fetchPreview = async (req, res) => {
  const id = friendLinkIdDTO(req.params);
  const link = await FriendLink.findByPk(id);
  if (!link) throw new AppError(404, '友链不存在');

  const meta = await fetchOgMeta(link.url);
  const avatarFilled = Boolean(meta?.favicon) && !link.avatar;

  if (!meta?.image && !avatarFilled) {
    return res.json({
      avatar: link.avatar || null,
      preview_image: link.preview_image || null,
      title: null,
      description: null,
      message: '未找到可用的图片'
    });
  }

  // 空字段自动填充 OG 抓到的标题/简介（手动填过的不覆盖）
  const title = meta.title ? truncate(meta.title.trim(), 32) : null;
  const description = meta.description ? truncate(meta.description.trim(), 128) : null;
  const updateData = {};
  if (meta.image) updateData.preview_image = meta.image;
  if (avatarFilled) updateData.avatar = meta.favicon;
  if (!link.name && title) updateData.name = title;
  if (!link.description && description) updateData.description = description;
  await link.update(updateData);

  let message = `已抓取${[meta.image ? '背景图' : null, avatarFilled ? '头像' : null].filter(Boolean).join('、')}`;
  if (meta.favicon && !avatarFilled) message += '（头像保留手填值，清空后可重抓）';

  res.json({
    title,
    description,
    avatar: link.avatar || null,
    preview_image: link.preview_image || null,
    message
  });
};