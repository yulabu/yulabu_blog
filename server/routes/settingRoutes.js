const express = require('express');
const router = express.Router();
const settingController = require('@controllers/settingController');

// 公开读：前台文章页 SSR 用它判断是否展示评论区；写入口在 /api/admin/settings（需登录）
router.get('/', settingController.getSettings);

module.exports = router;
