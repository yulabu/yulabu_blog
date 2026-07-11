const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

// GET /api/posts        - 文章列表
router.get('/', postController.getPosts);
// GET /api/posts/:id    - 文章详情
router.get('/:id', postController.getPostById);
// POST /api/posts       - 创建文章
router.post('/', postController.createPost);
// PUT /api/posts/:id    - 更新文章
router.put('/:id', postController.updatePost);
// DELETE /api/posts/:id - 删除文章
router.delete('/:id', postController.deletePost);

module.exports = router;