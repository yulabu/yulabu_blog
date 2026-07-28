const fs = require('fs').promises
const path = require('path')
const sharp = require('sharp')
const AppError = require('@middleware/AppError')
const { UPLOAD_DIR } = require('@config/upload')

// 文件名安全处理（防注入）
function sanitizeFilename(name) {
  const base = path.basename(name)
  let safe = base.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_')
  safe = safe.replace(/_{2,}/g, '_').replace(/^\.+/, '')
  if (!safe || safe === '_') {
    const ext = path.extname(base) || '.png'
    safe = `image${ext}`
  }
  return safe
}

async function saveImage(buffer, targetDir, originalName) {
  let metadata
  try {
    metadata = await sharp(buffer).metadata()
  } catch (err) {
    throw new AppError(400, '无效的图片文件')
  }

  const allowed = ['jpeg', 'jpg', 'png', 'webp']
  if (!allowed.includes(metadata.format)) {
    throw new AppError(400, '只允许上传 jpg/png/webp 图片')
  }

  const extMap = { jpeg: '.jpg', jpg: '.jpg', png: '.png', webp: '.webp' }
  const ext = extMap[metadata.format] || '.png'
  const safeName = sanitizeFilename(originalName)
  const base = path.basename(safeName, path.extname(safeName))
  const finalName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}${ext}`

  await fs.mkdir(targetDir, { recursive: true })

  const outputPath = path.join(targetDir, finalName)
  await sharp(buffer).toFile(outputPath)

  return finalName
}

async function finalizeTempImages(postId, tempId, content) {
  const tempDir = path.join(UPLOAD_DIR, 'temp', tempId)
  const postDir = path.join(UPLOAD_DIR, String(postId))

  try {
    await fs.access(tempDir)
  } catch (err) {
    return content
  }

  await fs.mkdir(postDir, { recursive: true })

  const files = await fs.readdir(tempDir)
  for (const file of files) {
    await fs.rename(
      path.join(tempDir, file),
      path.join(postDir, file)
    )
  }

  await fs.rm(tempDir, { recursive: true, force: true })

  const escapedTempId = tempId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return content.replace(
    new RegExp(`/uploads/temp/${escapedTempId}/`, 'g'),
    `/uploads/${postId}/`
  )
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const MAX_TEMP_AGE_MS = 7 * ONE_DAY_MS

async function cleanupOldTempDirs() {
  const tempDir = path.join(UPLOAD_DIR, 'temp')

  try {
    await fs.access(tempDir)
  } catch (err) {
    return
  }

  const now = Date.now()
  const entries = await fs.readdir(tempDir, { withFileTypes: true })
  let removed = 0

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const dirPath = path.join(tempDir, entry.name)
    const stat = await fs.stat(dirPath)

    if (now - stat.mtimeMs > MAX_TEMP_AGE_MS) {
      await fs.rm(dirPath, { recursive: true, force: true })
      removed++
      console.log(`已删除过期临时目录: ${entry.name}`)
    }
  }

  console.log(`临时目录清理完成，共删除 ${removed} 个`)
}

module.exports = {
  saveImage,
  finalizeTempImages,
  sanitizeFilename,
  cleanupOldTempDirs
}
