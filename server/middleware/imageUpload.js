// 图片上传中间件：磁盘流式落盘，避免 memoryStorage 的内存峰值问题
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { TMP_DIR, UPLOAD_MAX_FILE_SIZE, UPLOAD_MAX_FILES } = require('@config/image')

// 临时落盘目录（处理完成后由 controller 清理，GC 兜底过期清理）
fs.mkdirSync(TMP_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: UPLOAD_MAX_FILE_SIZE,
    files: UPLOAD_MAX_FILES
  }
})

module.exports = upload