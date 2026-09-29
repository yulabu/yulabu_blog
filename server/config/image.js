const path = require('path')

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '..', '..', 'uploads')

// 上传临时落盘目录（multer 中间目录，GC 兜底清理）
const TMP_DIR = path.join(UPLOAD_DIR, '.tmp')

// 缩略图宽度（高度按比例）
const THUMB_WIDTH = Number(process.env.THUMB_WIDTH) || 400
// webp 压缩质量
const IMAGE_QUALITY = Number(process.env.IMAGE_QUALITY) || 85

// 上传限额：单张 / 单次请求总量 / 单次文件数（env 名沿用历史值，默认值不动）。
// 放 config 是唯一出处——三个消费者都从这里取：中间件的 multer limits、
// 错误文案（errors/translate/multer.js）、控制器上传后的总量校验（imageController）。
// 单次请求张数只是护栏：前端 uploadImages 会自己分片（见 admin 的 src/api/image.ts），
// 真正的批量（编辑器粘贴多张 / 导入 Markdown 附图片）不该靠它兜住
const UPLOAD_MAX_FILE_SIZE = Number(process.env.UPLOAD_MAX_SIZE) || 5 * 1024 * 1024
const UPLOAD_MAX_TOTAL_SIZE = Number(process.env.UPLOAD_MAX_TOTAL_SIZE) || 20 * 1024 * 1024
const UPLOAD_MAX_FILES = Number(process.env.UPLOAD_MAX_FILES) || 50

module.exports = {
  UPLOAD_DIR,
  TMP_DIR,
  THUMB_WIDTH,
  IMAGE_QUALITY,
  UPLOAD_MAX_FILE_SIZE,
  UPLOAD_MAX_TOTAL_SIZE,
  UPLOAD_MAX_FILES
}