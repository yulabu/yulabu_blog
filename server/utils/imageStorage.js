const fs = require('fs').promises
const path = require('path')
const sharp = require('sharp')
const AppError = require('@middleware/AppError')
const { UPLOAD_DIR, THUMB_WIDTH, IMAGE_QUALITY } = require('@config/image')

const ALLOWED_FORMATS = ['jpeg', 'jpg', 'png', 'webp']

// 当前日期分片相对路径：YYYY/MM
function dateShardPath(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}/${m}`
}

// 保存磁盘上的图片文件到正式布局，返回元信息（文件层，不碰 Image 表）
// sourcePath 为 multer 落盘的临时文件路径
// 注意：必须 readFile 后以 buffer 喂 sharp——实测 sharp 直接处理 webp 路径时
// libvips 会持续占用文件句柄（Windows 下 unlink 报 EBUSY），buffer 模式无此问题。
async function saveImageFile(sourcePath) {
  let buffer
  try {
    buffer = await fs.readFile(sourcePath)
  } catch (err) {
    throw new AppError(400, '无法读取上传文件')
  }

  let metadata
  try {
    metadata = await sharp(buffer).metadata()
  } catch (err) {
    throw new AppError(400, '无效的图片文件')
  }

  if (!ALLOWED_FORMATS.includes(metadata.format)) {
    throw new AppError(400, '只允许上传 jpg/png/webp 图片')
  }

  const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const shard = dateShardPath()
  const targetDir = path.join(UPLOAD_DIR, shard)
  await fs.mkdir(targetDir, { recursive: true })

  const storagePath = `${shard}/${baseName}.webp`
  const thumbPath = `${shard}/${baseName}.thumb.webp`

  // 注意：sharp 0.35 默认（不调用 withMetadata/keepExif）即剥离全部元数据（EXIF/ICC）。
  // 实测 withMetadata(false) 反而会保留元数据并注入 sRGB ICC（行为与文档相反），切勿添加。
  await sharp(buffer)
    .rotate()
    .webp({ quality: IMAGE_QUALITY })
    .toFile(path.join(targetDir, `${baseName}.webp`))

  const { width } = metadata
  if (width > THUMB_WIDTH) {
    await sharp(buffer)
      .rotate()
      .resize({ width: THUMB_WIDTH })
      .webp({ quality: IMAGE_QUALITY })
      .toFile(path.join(targetDir, `${baseName}.thumb.webp`))
  } else {
    await fs.copyFile(
      path.join(targetDir, `${baseName}.webp`),
      path.join(targetDir, `${baseName}.thumb.webp`)
    )
  }

  const fileSize = (await fs.stat(path.join(targetDir, `${baseName}.webp`))).size

  return { storagePath, thumbPath, fileSize }
}

// 物理删除图片文件（原图 + 可选缩略图），ENOENT 忽略
async function deleteImageFiles(storagePath, thumbPath) {
  for (const rel of [storagePath, thumbPath]) {
    if (!rel) continue
    try {
      await fs.unlink(path.join(UPLOAD_DIR, rel))
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`删除图片文件失败: ${rel}`, err.message)
      }
    }
  }
}

module.exports = {
  saveImageFile,
  deleteImageFiles
}