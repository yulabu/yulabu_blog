const express = require('express');
const router = express.Router();
const musicController = require('@controllers/musicController');

// 公开读：前台播放器（歌单 + 逐曲直链），无需登录。
// 解析直链的接口只对「配置歌单里确实存在的曲目」放行（白名单守卫在 services/music/index.js），
// 别在这里加放行逻辑——守卫与歌单缓存同处一层才不会被绕过
router.get('/playlists', musicController.getPlaylists);
router.get('/tracks/:id/url', musicController.getTrackStream);

module.exports = router;
