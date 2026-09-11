function columnDetail(column, postCount = 0) {
  return {
    id: column.column_id,
    name: column.column_name,
    desc: column.column_desc || null,
    cover: column.column_cover || null,
    sort_order: column.sort_order,
    status: column.status,
    post_count: postCount,
    created_at: column.createdAt,
    updated_at: column.updatedAt
  };
}

function columnList(columns, countMap = {}) {
  return columns.map(column => columnDetail(column, countMap[column.column_id] || 0));
}

// 专栏详情中的文章项
// cover 必须带上：前台点击条目时把整个对象交给文章过渡卡片（utils/postSplash），
// 卡片读 post.cover 取封面图；漏了这个字段，从专栏进文章就只剩首字兜底
function columnPostItem(post, sort) {
  return {
    id: post.post_id,
    title: post.post_title,
    summary: post.post_summary || null,
    cover: post.post_cover || null,
    category: post.category ? { id: post.category.tag_id, name: post.category.tag_name } : null,
    createdAt: post.createdAt,
    sort: sort
  };
}

// 上一篇/下一篇：同理，缺 cover 会让上下篇跳转的过渡卡片丢封面
function prevNextVO(post) {
  if (!post) return { post: null };
  return {
    post: {
      id: post.post_id,
      title: post.post_title,
      cover: post.post_cover || null
    }
  };
}

module.exports = { columnDetail, columnList, columnPostItem, prevNextVO };