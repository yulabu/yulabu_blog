const router = require('express').Router()
const auth = require('@middleware/auth')
const upload = require('@middleware/upload')
const uploadController = require('@controllers/uploadController')

router.post(
  '/batch',
  auth, // 鉴权
  upload.array('images', 50), // multer解析文件
  uploadController.uploadBatch // 处理逻辑
)

module.exports = router
