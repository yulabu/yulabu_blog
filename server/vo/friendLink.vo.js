// 本地相对路径拼 /uploads/ 前缀；历史外链数据（http 开头）原样输出
function previewUrl(previewImage) {
  if (!previewImage) return null;
  return /^https?:\/\//i.test(previewImage) ? previewImage : `/uploads/${previewImage}`;
}

function friendLinkDetail(link) {
  return {
    id: link.friend_link_id,
    name: link.name,
    url: link.url,
    avatar: link.avatar || null,
    description: link.description || null,
    preview_image: previewUrl(link.preview_image),
    sort_order: link.sort_order,
    status: link.status,
    created_at: link.createdAt,
    updated_at: link.updatedAt
  };
}

function friendLinkList(links) {
  return links.map(friendLinkDetail);
}

module.exports = { friendLinkDetail, friendLinkList };
