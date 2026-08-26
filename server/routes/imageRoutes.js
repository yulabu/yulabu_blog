const router = require('express').Router()
const auth = require('@middleware/auth')
const upload = require('@middleware/imageUpload')
const imageController = require('@controllers/imageController')

router.post(
  '/upload',
  auth,
  upload.array('images', upload.MAX_FILES),
  imageController.uploadBatch
)

module.exports = router