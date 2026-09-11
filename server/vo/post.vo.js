function postDetail(post) {
  return {
    id: post.post_id,
    title: post.post_title,
    content: post.post_content,
    summary: post.post_summary,
    author: post.post_author,
    category: post.category ? toCategory(post.category) : null,
    column: post.columnPost && post.columnPost.column ? toColumn(post.columnPost.column) : null,
    cover: post.post_cover || null,
    status: post.post_status,
    viewCount: post.view_count || 0,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

// 文章列表项 VO
// 比详情多一个 coverThumb：列表里的**小卡**封面用 400px 缩略图（显示宽只有 112–182px，
// 2x/3x 屏都够清晰），大图卡与文章页/过渡卡片仍用 cover 原图。取不到时为 null
// （外链封面、没有 image 记录的老数据，以及未 include coverImage 的后台查询），
// 前端一律 `coverThumb || cover` 回退。
function postSummary(post) {
  const { content, ...rest } = postDetail(post);
  return {
    ...rest,
    coverThumb:
      post.coverImage && post.coverImage.thumb_path
        ? `/uploads/${post.coverImage.thumb_path}`
        : null,
  };
}

// 内部：分类字段转换
function toCategory(tag) {
  return {
    id: tag.tag_id,
    name: tag.tag_name,
  };
}

// 内部：专栏字段转换
function toColumn(column) {
  return {
    id: column.column_id,
    name: column.column_name,
  };
}

module.exports = { postDetail, postSummary };