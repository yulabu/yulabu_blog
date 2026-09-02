const express = require('express');
const router = express.Router();
const auth = require('@middleware/auth');
const upload = require('@middleware/imageUpload');
const adminController = require('@controllers/adminController');
const adminAccountController = require('@controllers/adminAccountController');
const postController = require('@controllers/postController');
const friendLinkController = require('@controllers/friendLinkController');
const visitController = require('@controllers/visitController');
const columnController = require('@controllers/columnController');
const imageController = require('@controllers/imageController');
const diaryController = require('@controllers/diaryController');

// 所有 /api/admin/* 接口都需要登录
router.use(auth);

// 管理员账号管理
router.get('/admins', adminAccountController.getAdminList);
router.get('/admins/me', adminAccountController.getCurrentAdmin);
router.post('/admins', adminAccountController.createAdmin);
router.put('/admins/:id', adminAccountController.updateAdmin);
router.delete('/admins/:id', adminAccountController.deleteAdmin);

// 工作台
router.get('/dashboard', adminController.getDashboard);
router.get('/dashboard/charts', adminController.getDashboardCharts);

// 文章管理（三种状态统一列表，前端按 status 切换；回收站操作归此）
router.get('/posts', postController.getAdminPosts);
router.get('/posts/:id', postController.getAdminPostById);
router.put('/posts/:id/restore', postController.restorePost);
router.delete('/posts/:id/force', postController.forceDeletePost);

// 友链管理
router.get('/friendlinks', friendLinkController.getAdminLinks);
router.get('/friendlinks/:id', friendLinkController.getLinkById);
router.post('/friendlinks', friendLinkController.createLink);
router.put('/friendlinks/:id', friendLinkController.updateLink);
router.put('/friendlinks/:id/preview', friendLinkController.fetchPreview);
router.delete('/friendlinks/:id', friendLinkController.deleteLink);

// 专栏管理
router.get('/columns', columnController.getAdminColumns);
router.post('/columns', columnController.createColumn);
router.post('/columns/:id/cover', upload.single('image'), columnController.uploadColumnCover);
router.put('/columns/:id', columnController.updateColumn);
router.delete('/columns/:id', columnController.deleteColumn);
router.get('/columns/:id/posts', columnController.getColumnPosts);
router.post('/columns/:id/posts', columnController.addColumnPost);
router.delete('/columns/:id/posts/:postId', columnController.removeColumnPost);
router.put('/columns/:id/order', columnController.updateColumnPostOrder);

// 图片库管理
router.get('/images', imageController.getImages);
router.get('/images/:id', imageController.getImageById);
router.delete('/images/batch', imageController.deleteImagesBatch);
router.delete('/images/:id', imageController.deleteImage);

// 访问日志管理
router.get('/visits', visitController.getVisits);
router.get('/visits/stats', visitController.getVisitStats);
router.delete('/visits', visitController.clearAllVisits);

// 日记管理
router.get('/diaries', diaryController.getAdminDiaries);
router.get('/diaries/:id', diaryController.getDiaryById);
router.post('/diaries', diaryController.createDiary);
router.put('/diaries/:id', diaryController.updateDiary);
router.delete('/diaries/:id', diaryController.deleteDiary);

module.exports = router;
