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

module.exports = { UPLOAD_DIR, TMP_DIR, THUMB_WIDTH, IMAGE_QUALITY }