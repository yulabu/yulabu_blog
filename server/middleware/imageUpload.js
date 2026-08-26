// 上传图片中间件，限制传入大小
const multer = require('multer')

const MAX_SIZE = Number(process.env.UPLOAD_MAX_SIZE) || 5 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_SIZE,
    files: 50
  }
})

module.exports = upload
