const AppError = require('@middleware/AppError');
const fs = require('fs').promises;
const path = require('path');
const { Op } = require('sequelize');
const { sequelize, FriendLink, Image } = require('@models');
const { createFriendLinkDTO, updateFriendLinkDTO, friendLinkIdDTO } = require('@dto/friendLink.dto');
const { friendLinkDetail, friendLinkList } = require('@vo/friendLink.vo');
const { fetchOgMeta, downloadImage, decodeImageBuffer } = require('@utils/ogImage');
const { saveImageFile, deleteImageFiles } = require('@utils/imageStorage');
const { TMP_DIR } = require('@config/image');

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

  // 收集友链预览图（删除时同步物理清理，不残留孤儿）
  const linkImages = await Image.findAll({
    where: { reference_type: 'friend_link', reference_id: id }
  });

  await sequelize.transaction(async (t) => {
    if (linkImages.length > 0) {
      await Image.destroy({
        where: { image_id: { [Op.in]: linkImages.map(img => img.image_id) } },
        transaction: t
      });
    }
    await link.destroy({ transaction: t });
  });

  // 事务成功后删文件（单个失败忽略，避免残留文件阻塞删除）
  for (const image of linkImages) {
    await deleteImageFiles(image.storage_path, image.thumb_path);
  }

  res.json({ id: link.friend_link_id, message: '删除成功' });
};

exports.fetchPreview = async (req, res) => {
  const id = friendLinkIdDTO(req.params);
  const link = await FriendLink.findByPk(id);
  if (!link) throw new AppError(404, '友链不存在');

  const meta = await fetchOgMeta(link.url);
  const ogImageUrl = meta?.image;

  if (!ogImageUrl) {
    return res.json({ preview_image: null, message: '未找到可用的预览图' });
  }

  const downloaded = await downloadImage(ogImageUrl);
  if (!downloaded) {
    return res.json({ preview_image: null, message: '未找到可用的预览图' });
  }

  // 格式分流：png/jpg/webp 原样；svg/ico 转 png（sharp 不支持 ico，用 icojs 解码）
  const decoded = await decodeImageBuffer(downloaded.buffer);
  if (!decoded) {
    return res.json({ preview_image: null, message: '图片格式无法处理' });
  }

  // buffer → TMP_DIR 临时文件 → saveImageFile 落盘（finally 清理临时文件）
  await fs.mkdir(TMP_DIR, { recursive: true });
  const tmpFile = path.join(TMP_DIR, `fl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  let saved;
  try {
    await fs.writeFile(tmpFile, decoded);
    saved = await saveImageFile(tmpFile);
  } catch (err) {
    // 非图片/格式非法等，当无图处理
    return res.json({ preview_image: null, message: '未找到可用的预览图' });
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }

  // 旧图清理（重复抓取不残留）
  const oldImages = await Image.findAll({
    where: { reference_type: 'friend_link', reference_id: id }
  });
  if (oldImages.length > 0) {
    await Image.destroy({
      where: { image_id: { [Op.in]: oldImages.map(img => img.image_id) } }
    });
    for (const old of oldImages) {
      await deleteImageFiles(old.storage_path, old.thumb_path);
    }
  }

  // 新图记录（image 表为权威，preview_image 存相对路径作冗余索引）
  await Image.create({
    reference_type: 'friend_link',
    reference_id: id,
    storage_path: saved.storagePath,
    thumb_path: saved.thumbPath,
    file_size: saved.fileSize
  });

  // 空字段自动填充 OG 抓到的标题/简介（手动填过的不覆盖）
  const title = meta.title ? truncate(meta.title.trim(), 32) : null;
  const description = meta.description ? truncate(meta.description.trim(), 128) : null;
  const updateData = { preview_image: saved.storagePath };
  if (!link.name && title) updateData.name = title;
  if (!link.description && description) updateData.description = description;
  await link.update(updateData);

  res.json({
    title,
    description,
    preview_image: `/uploads/${saved.storagePath}`,
    message: '预览图抓取成功'
  });
};