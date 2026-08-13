const express = require('express');
const router = express.Router();
const momentController = require('@controllers/momentController');

router.get('/', momentController.getPublicMoments);

module.exports = router;
