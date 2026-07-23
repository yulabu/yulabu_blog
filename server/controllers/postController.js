const AppError = require('../middleware/AppError');
const { createPostDTO, updatePostDTO, listPostsDTO, postIdDTO } = require('../dto/post.dto');
const { Post, Tag } = require('../models');
const { postDetail, postSummary } = require('../vo/post.vo');

// 获取文章列表（带分类 + 分页）
exports.getPosts = async (req, res) => {

  const { page, limit, category_id } = listPostsDTO(req.query);
  const offset = (page - 1) * limit;

  const where = { post_status: 'published' };
  if (category_id) {
    where.post_category_id = category_id;
  }
  const { rows: posts, count: total } = await Post.findAndCountAll({
    where,
    include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name'] },
    order: [['created_at', 'DESC']], // 按创建时间降序排列
    limit,
    offset,
  });

  res.json({ posts: posts.map(postSummary), total, page, totalPages: Math.ceil(total / limit) });

};

// 获取单篇文章详情
exports.getPostById = async (req, res) => {
  const postId = postIdDTO(req.params);
  const post = await Post.findByPk(postId, {
    include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name'] },
  });
  if (!post || post.post_status !== 'published') throw new AppError(404, '文章不存在');
  res.json(postDetail(post));
};

// 创建文章
exports.createPost = async (req, res) => {
  const data = createPostDTO(req.body);
  const post = await Post.create(data);
  res.status(201).json({ id: post.post_id, message: '创建成功' });
};

// 更新文章
exports.updatePost = async (req, res) => {
  const postId = postIdDTO(req.params);
  const post = await Post.findByPk(postId);
  if (!post) throw new AppError(404, '文章不存在');

  const data = updatePostDTO(req.body);
  await post.update(data);
  res.json({ id: post.post_id, message: '更新成功' });
};

// 删除文章（软删除，改为 trash 状态）
exports.deletePost = async (req, res) => {
  const postId = postIdDTO(req.params);
  const post = await Post.findByPk(postId);
  if (!post) throw new AppError(404, '文章不存在');

  await post.update({ post_status: 'trash' });
  res.json({ message: '已移入回收站' });
};