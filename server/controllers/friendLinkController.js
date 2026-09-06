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

  // preview_image_id 引用随行消失，物理文件由 GC 对账宽限后回收
  await link.destroy();

  res.json({ id: link.friend_link_id, message: '删除成功' });
};

// 抓取友链图片（外链模式）：og:image / favicon 的外部 URL 直接写入 avatar，
// 不再下载落盘——友链不进图片系统，无 image 记录无引用指针；
// 覆盖抓取时置空 preview_image_id，旧本地图失去引用由 GC 延迟回收
exports.fetchPreview = async (req, res) => {
  const id = friendLinkIdDTO(req.params);
  const link = await FriendLink.findByPk(id);
  if (!link) throw new AppError(404, '友链不存在');

  const meta = await fetchOgMeta(link.url);
  const imageUrl = meta?.image;

  if (!imageUrl) {
    return res.json({ avatar: null, title: null, description: null, message: '未找到可用的图片' });
  }

  // 空字段自动填充 OG 抓到的标题/简介（手动填过的不覆盖）
  const title = meta.title ? truncate(meta.title.trim(), 32) : null;
  const description = meta.description ? truncate(meta.description.trim(), 128) : null;
  const updateData = { avatar: imageUrl, preview_image: null, preview_image_id: null };
  if (!link.name && title) updateData.name = title;
  if (!link.description && description) updateData.description = description;
  await link.update(updateData);

  res.json({
    title,
    description,
    avatar: imageUrl,
    message: '图片抓取成功'
  });
};