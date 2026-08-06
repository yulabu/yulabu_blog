const router = require('express').Router()
const auth = require('@middleware/auth')
const upload = require('@middleware/upload')
const uploadController = require('@controllers/uploadController')

router.post(
  '/batch',
  auth,
  upload.array('images', 50),
  uploadController.uploadBatch
)

router.delete(
  '/temp/:temp_id',
  auth,
  uploadController.deleteTemp
)

module.exports = router
