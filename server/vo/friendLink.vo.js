function friendLinkDetail(link) {
  return {
    id: link.friend_link_id,
    name: link.name,
    url: link.url,
    avatar: link.avatar || null,
    description: link.description || null,
    preview_image: link.preview_image || null,
    sort_order: link.sort_order,
    status: link.status,
    created_at: link.created_at,
    updated_at: link.updated_at
  };
}

function friendLinkList(links) {
  return links.map(friendLinkDetail);
}

module.exports = { friendLinkDetail, friendLinkList };
