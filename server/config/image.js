const path = require('path')
const env = require('./env')

const UPLOAD_DIR = env.paths.uploadDir
  ? path.resolve(env.paths.uploadDir)
  : path.resolve(__dirname, '..', '..', 'uploads')

// 上传临时落盘目录（multer 中间目录，GC 兜底清理）
const TMP_DIR = path.join(UPLOAD_DIR, '.tmp')

// 缩略图宽度（高度按比例）
const THUMB_WIDTH = env.image.thumbWidth
// webp 压缩质量
const IMAGE_QUALITY = env.image.quality

// 上传限额：单张 / 单次请求总量 / 单次文件数（env 名沿用历史值，默认值不动）。
// 放 config 是唯一出处——三个消费者都从这里取：中间件的 multer limits、
// 错误文案（errors/translate/multer.js）、控制器上传后的总量校验（imageController）。
// 单次请求张数只是护栏：前端 uploadImages 会自己分片（见 admin 的 src/api/image.ts），
// 真正的批量（编辑器粘贴多张 / 导入 Markdown 附图片）不该靠它兜住
const UPLOAD_MAX_FILE_SIZE = env.image.maxFileSize
const UPLOAD_MAX_TOTAL_SIZE = env.image.maxTotalSize
const UPLOAD_MAX_FILES = env.image.maxFiles

module.exports = {
  UPLOAD_DIR,
  TMP_DIR,
  THUMB_WIDTH,
  IMAGE_QUALITY,
  UPLOAD_MAX_FILE_SIZE,
  UPLOAD_MAX_TOTAL_SIZE,
  UPLOAD_MAX_FILES
}
