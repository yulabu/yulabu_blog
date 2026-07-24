const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const noticeController = require('../controllers/noticeController');

// 所有 /api/admin/* 接口都需要登录
router.use(auth);

// 工作台
router.get('/dashboard', adminController.getDashboard);

// 文章回收站
router.get('/posts/trash', adminController.getTrashPosts);
router.put('/posts/:id/restore', adminController.restorePost);
router.delete('/posts/:id/force', adminController.forceDeletePost);

// 公告管理
router.get('/notices', noticeController.getAdminNotices);
router.get('/notices/:id', noticeController.getNoticeById);
router.post('/notices', noticeController.createNotice);
router.put('/notices/:id', noticeController.updateNotice);
router.delete('/notices/:id', noticeController.deleteNotice);
router.put('/notices/:id/pin', noticeController.togglePin);

module.exports = router;
