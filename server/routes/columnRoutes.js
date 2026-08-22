const express = require('express');
const router = express.Router();
const columnController = require('@controllers/columnController');

router.get('/', columnController.getPublicColumns);
router.get('/:id', columnController.getColumnById);

module.exports = router;