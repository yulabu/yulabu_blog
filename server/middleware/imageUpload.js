// 图片上传中间件：磁盘流式落盘，避免 memoryStorage 的内存峰值问题
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { TMP_DIR } = require('@config/image')

const MAX_FILE_SIZE = Number(process.env.UPLOAD_MAX_SIZE) || 5 * 1024 * 1024
const MAX_TOTAL_SIZE = Number(process.env.UPLOAD_MAX_TOTAL_SIZE) || 20 * 1024 * 1024
// 单次请求张数。前端 uploadImages 会自己分片（见 admin 的 src/api/image.ts），
// 这里只是护栏：真正的批量（编辑器粘贴多张 / 导入 Markdown 附图片）不该靠它兜住
const MAX_FILES = Number(process.env.UPLOAD_MAX_FILES) || 50

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
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES
  }
})

module.exports = upload
module.exports.MAX_FILE_SIZE = MAX_FILE_SIZE
module.exports.MAX_TOTAL_SIZE = MAX_TOTAL_SIZE
module.exports.MAX_FILES = MAX_FILES
module.exports.TMP_DIR = TMP_DIR