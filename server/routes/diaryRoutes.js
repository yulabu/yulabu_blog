const express = require('express');
const router = express.Router();
const diaryController = require('@controllers/diaryController');

router.get('/', diaryController.getPublicDiaries);

module.exports = router;
