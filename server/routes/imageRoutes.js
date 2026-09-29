const router = require('express').Router()
const auth = require('@middleware/auth')
const upload = require('@middleware/imageUpload')
const imageController = require('@controllers/imageController')
const { UPLOAD_MAX_FILES } = require('@config/image')

router.post(
  '/upload',
  auth,
  upload.array('images', UPLOAD_MAX_FILES),
  imageController.uploadBatch
)

module.exports = router