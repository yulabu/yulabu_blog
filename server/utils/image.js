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

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 从正文中提取某个上传目录下被引用的文件名
function extractReferencedImages(content, postId) {
  const refs = new Set()
  if (!content) return refs

  const prefix = `/uploads/${escapeRegExp(String(postId))}/`
  const regex = new RegExp(`${prefix}([^)\\s"<>]+)`, 'g')

  let match
  while ((match = regex.exec(content)) !== null) {
    refs.add(decodeURIComponent(match[1]))
  }

  return refs
}

// 同步文章上传目录：只保留正文中引用到的图片
async function syncPostImages(postId, content) {
  const postDir = path.join(UPLOAD_DIR, String(postId))

  let files
  try {
    await fs.access(postDir)
    files = await fs.readdir(postDir)
  } catch (err) {
    return
  }

  const referenced = extractReferencedImages(content, postId)
  for (const file of files) {
    if (referenced.has(file)) continue
    try {
      await fs.unlink(path.join(postDir, file))
    } catch (err) {
      // 忽略单个文件删除失败，继续处理其余文件
      console.error(`删除未引用图片失败: ${file}`, err.message)
    }
  }
}

// 彻底删除文章时清理整个上传目录
async function deletePostImages(postId) {
  const postDir = path.join(UPLOAD_DIR, String(postId))
  try {
    await fs.rm(postDir, { recursive: true, force: true })
  } catch (err) {
    // 目录不存在或删除失败均忽略
  }
}

async function finalizeTempImages(postId, tempId, content) {
  const tempDir = path.join(UPLOAD_DIR, 'temp', tempId)
  const postDir = path.join(UPLOAD_DIR, String(postId))

  let files
  try {
    await fs.access(tempDir)
    files = await fs.readdir(tempDir)
  } catch (err) {
    return content
  }

  await fs.mkdir(postDir, { recursive: true })

  // 只迁移正文中实际引用到的 temp 图片
  const escapedTempId = escapeRegExp(tempId)
  const referencedRegex = new RegExp(`/uploads/temp/${escapedTempId}/([^)\\s"<>]+)`, 'g')
  const referenced = new Set()
  let match
  while ((match = referencedRegex.exec(content)) !== null) {
    referenced.add(decodeURIComponent(match[1]))
  }

  for (const file of files) {
    const src = path.join(tempDir, file)
    const dest = path.join(postDir, file)
    if (referenced.has(file)) {
      await fs.rename(src, dest)
    } else {
      await fs.unlink(src)
    }
  }

  await fs.rm(tempDir, { recursive: true, force: true })

  return content.replace(
    new RegExp(`/uploads/temp/${escapedTempId}/`, 'g'),
    `/uploads/${postId}/`
  )
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const MAX_TEMP_AGE_MS = 1 * ONE_DAY_MS

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
  syncPostImages,
  deletePostImages,
  sanitizeFilename,
  cleanupOldTempDirs,
  ONE_DAY_MS
}
