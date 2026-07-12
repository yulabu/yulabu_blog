const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const auth = require('../middleware/auth');       // 加这行

router.get('/', postController.getPosts);
router.get('/:id', postController.getPostById);
router.post('/', auth, postController.createPost);      // 改这行
router.put('/:id', auth, postController.updatePost);    // 改这行
router.delete('/:id', auth, postController.deletePost); // 改这行

module.exports = router;