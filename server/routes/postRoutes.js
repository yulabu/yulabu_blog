// routes/postRoutes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

// GET /api/posts - 获取文章列表
router.get('/', postController.getPosts);

module.exports = router;