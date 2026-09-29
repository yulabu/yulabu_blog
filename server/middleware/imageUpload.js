// 图片上传中间件：磁盘流式落盘，避免 memoryStorage 的内存峰值问题
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { TMP_DIR, UPLOAD_MAX_FILE_SIZE, UPLOAD_MAX_FILES } = require('@config/image')

const storage = multer.diskStorage({
  // 临时落盘目录按需创建：只有真的有文件落盘才建，模块加载本身不产生副作用（处理完成后
  // 由 controller 清理，GC 兜底过期清理）。multer 文档写明：destination 传函数时由调用方
  // 负责建目录；传字符串它会在 diskStorage() 构造时自己 mkdirSync ——那正是本模块的 require 期，
  // 等于把副作用挪进 multer 而没解决。目录已存在时 mkdirSync(recursive) 只是一次 syscall，
  // 刻意不缓存"已建好"状态：留着自愈能力（有人手工删了 .tmp，下次上传自动重建）
  destination: (req, file, cb) => {
    try {
      fs.mkdirSync(TMP_DIR, { recursive: true })
      cb(null, TMP_DIR)
    } catch (err) {
      cb(err) // 交 multer → next(err) → errorHandler（5xx + 记日志）
    }
  },
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