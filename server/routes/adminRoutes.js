const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// 所有 /api/admin/* 接口都需要登录
router.use(auth);

router.get('/dashboard', adminController.getDashboard);
router.get('/posts/trash', adminController.getTrashPosts);
router.put('/posts/:id/restore', adminController.restorePost);
router.delete('/posts/:id/force', adminController.forceDeletePost);

module.exports = router;
