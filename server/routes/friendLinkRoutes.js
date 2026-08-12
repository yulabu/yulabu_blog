const express = require('express');
const router = express.Router();
const friendLinkController = require('@controllers/friendLinkController');

router.get('/', friendLinkController.getPublicLinks);

module.exports = router;
