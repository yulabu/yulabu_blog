function friendLinkDetail(link) {
  return {
    id: link.friend_link_id,
    name: link.name,
    url: link.url,
    avatar: link.avatar || null,
    preview_image: link.preview_image || null,
    description: link.description || null,
    sort_order: link.sort_order,
    status: link.status,
    created_at: link.createdAt,
    updated_at: link.updatedAt
  };
}

function friendLinkList(links) {
  return links.map(friendLinkDetail);
}

// 抓图接口（PUT /admin/friendlinks/:id/preview）的响应形状与文案。
// 成功文案保持改前措辞；新增的区分只在失败时——ok=false 时用 reason（与 pm2 日志同源）替代
// 「未找到可用的图片」，让管理员能分辨「超时/被拒」与「页面确实没有图」。
// 前端只读 message，且按 200 成功 toast + 刷新列表处理（改状态码会变成红 toast，故保持 200）
function previewResultVO(result) {
  const { ok, reason, title, description, avatar, previewImage, filledAvatar, filledPreview, keptAvatar } = result;

  let message;
  if (!filledAvatar && !filledPreview) {
    message = ok === false && reason ? `抓取失败（${reason}）` : '未找到可用的图片';
  } else {
    message = `已抓取${[filledPreview ? '背景图' : null, filledAvatar ? '头像' : null].filter(Boolean).join('、')}`;
    if (keptAvatar) message += '（头像保留手填值，清空后可重抓）';
  }

  return {
    title,
    description,
    avatar,
    preview_image: previewImage,
    message
  };
}

module.exports = { friendLinkDetail, friendLinkList, previewResultVO };
