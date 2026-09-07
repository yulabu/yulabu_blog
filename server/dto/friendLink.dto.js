const AppError = require('@middleware/AppError');
const { parseId } = require('./common.dto');

// 友链图片一律外链：只接受 http(s):// 或协议相对 //。
// 友链已彻底退出图片系统、无引用指针，拒绝 /uploads/ 路径——手填本站路径会被 GC 当孤儿回收
function normalizeExternalUrl(value, label) {
  const url = value?.trim() || null;
  if (!url) return null;
  if (url.length > 512) throw new AppError(400, `${label}不能超过512个字符`);
  if (!/^(https?:\/\/|\/\/)/i.test(url)) throw new AppError(400, `${label}必须是 http(s) 外链地址`);
  return url;
}

function createFriendLinkDTO(body) {
  const name = body.name?.trim();
  const url = body.url?.trim();

  if (!name) throw new AppError(400, '友链名称不能为空');
  if (name.length > 32) throw new AppError(400, '友链名称不能超过32个字符');
  if (!url) throw new AppError(400, '链接地址不能为空');
  if (url.length > 256) throw new AppError(400, '链接地址不能超过256个字符');

  const dto = { name, url };

  if (body.avatar !== undefined) {
    dto.avatar = normalizeExternalUrl(body.avatar, '头像URL');
  }
  if (body.preview_image !== undefined) {
    dto.preview_image = normalizeExternalUrl(body.preview_image, '背景图URL');
  }
  if (body.description !== undefined) {
    const desc = body.description?.trim() || null;
    if (desc && desc.length > 128) throw new AppError(400, '简介不能超过128个字符');
    dto.description = desc;
  }
  if (body.sort_order !== undefined) {
    const order = parseInt(body.sort_order);
    if (isNaN(order)) throw new AppError(400, '排序值无效');
    dto.sort_order = order;
  }
  if (body.status !== undefined) {
    if (!['show', 'hide'].includes(body.status)) throw new AppError(400, '状态值无效');
    dto.status = body.status;
  }

  return dto;
}

function updateFriendLinkDTO(body) {
  const dto = {};

  if (body.name !== undefined) {
    const name = body.name?.trim();
    if (!name) throw new AppError(400, '友链名称不能为空');
    if (name.length > 32) throw new AppError(400, '友链名称不能超过32个字符');
    dto.name = name;
  }
  if (body.url !== undefined) {
    const url = body.url?.trim();
    if (!url) throw new AppError(400, '链接地址不能为空');
    if (url.length > 256) throw new AppError(400, '链接地址不能超过256个字符');
    dto.url = url;
  }
  if (body.avatar !== undefined) {
    dto.avatar = normalizeExternalUrl(body.avatar, '头像URL');
  }
  if (body.preview_image !== undefined) {
    dto.preview_image = normalizeExternalUrl(body.preview_image, '背景图URL');
  }
  if (body.description !== undefined) {
    const desc = body.description?.trim() || null;
    if (desc && desc.length > 128) throw new AppError(400, '简介不能超过128个字符');
    dto.description = desc;
  }
  if (body.sort_order !== undefined) {
    const order = parseInt(body.sort_order);
    if (isNaN(order)) throw new AppError(400, '排序值无效');
    dto.sort_order = order;
  }
  if (body.status !== undefined) {
    if (!['show', 'hide'].includes(body.status)) throw new AppError(400, '状态值无效');
    dto.status = body.status;
  }

  if (Object.keys(dto).length === 0) throw new AppError(400, '没有需要更新的字段');
  return dto;
}

function friendLinkIdDTO(params) {
  return parseId(params, '友链');
}

module.exports = { createFriendLinkDTO, updateFriendLinkDTO, friendLinkIdDTO };
