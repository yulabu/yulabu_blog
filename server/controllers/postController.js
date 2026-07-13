const { createPostDTO, updatePostDTO, listPostsDTO, postIdDTO } = require('../dto/post.dto');
const { Post, Tag } = require('../models');
const { postDetail, postSummary } = require('../vo/post.vo');

// 获取文章列表（带分类 + 分页）
exports.getPosts = async (req, res) => {
  try {
    const { page, limit } = listPostsDTO(req.query);
    const offset = (page - 1) * limit;

    const { rows: posts, count: total } = await Post.findAndCountAll({
      include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name', 'tag_color'] },
      order: [['created_at', 'DESC']], // 按创建时间降序排列
      limit,
      offset,
    });

    res.json({ posts: posts.map(postSummary), total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || '服务器错误' });
  }
};

// 获取单篇文章详情
exports.getPostById = async (req, res) => {
  try {
    const postId = postIdDTO(req.params);
    const post = await Post.findByPk(postId, {
      include: { model: Tag, as: 'category', attributes: ['tag_id', 'tag_name', 'tag_color'] },
    });
    if (!post) return res.status(404).json({ message: '文章不存在' });
    res.json(postDetail(post));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || '服务器错误' });
  }
};

// 创建文章
exports.createPost = async (req, res) => {
  try {
    const data = createPostDTO(req.body);
    const post = await Post.create(data);
    res.status(201).json({ id: post.post_id, message: '创建成功' });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || '服务器错误' });
  }
};

// 更新文章
exports.updatePost = async (req, res) => {
  try {
    const postId = postIdDTO(req.params);
    const post = await Post.findByPk(postId);
    if (!post) return res.status(404).json({ message: '文章不存在' });

    const data = updatePostDTO(req.body);
    await post.update(data);
    res.json({ id: post.post_id, message: '更新成功' });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || '服务器错误' });
  }
};

// 删除文章（软删除，改为 trash 状态）
exports.deletePost = async (req, res) => {
  try {
    const postId = postIdDTO(req.params);
    const post = await Post.findByPk(postId);
    if (!post) return res.status(404).json({ message: '文章不存在' });

    await post.update({ post_status: 'trash' });
    res.json({ message: '已移入回收站' });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || '服务器错误' });
  }
};