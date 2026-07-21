function postDetail(post) {
  return {
    id: post.post_id,
    title: post.post_title,
    content: post.post_content,
    summary: post.post_summary,
    author: post.post_author,
    category: post.category ? toCategory(post.category) : null,
    status: post.post_status,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

// 文章列表项 VO
function postSummary(post) {
  const { content, ...rest } = postDetail(post);
  return rest;
}

// 内部：分类字段转换
function toCategory(tag) {
  return {
    id: tag.tag_id,
    name: tag.tag_name,
  };
}

module.exports = { postDetail, postSummary };