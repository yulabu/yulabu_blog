const fs = require('fs').promises
const path = require('path')
const sharp = require('sharp')
const { Op } = require('sequelize')
const AppError = require('@middleware/AppError')
const { UPLOAD_DIR } = require('@config/image')
const { Image, Post } = require('@models')

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 从正文中提取本系统图片的存储 key 集合（去重）
// 支持 Markdown 图片语法与 <img> 标签，只匹配 /uploads/ 开头的相对路径
function extractReferencedImages(content) {
  const refs = new Set()
  if (!content) return refs

  const patterns = [
    /!\[[^\]]*\]\(([^)]+)\)/g,
    /<img\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi
  ]

  for (const regex of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      const url = match[1]
      if (url.startsWith('/uploads/')) {
        try {
          const key = decodeURIComponent(url.slice('/uploads/'.length))
          if (key) refs.add(key)
        } catch (err) {
          // 忽略无法解码的 URL
        }
      }
    }
  }

  return refs
}

// 差集解绑：将绑定到文章但正文中已不引用的图片置为孤儿（reference_id = NULL）
// 幂等：重复调用（保存 + 离开兜底）无副作用
async function unbindUnusedFiles(postId) {
  const post = await Post.findByPk(postId)
  if (!post) return { unbound: 0 }

  const used = extractReferencedImages(post.post_content)
  const bound = await Image.findAll({
    where: { reference_type: 'post_content', reference_id: postId }
  })

  const unbindIds = bound
    .filter(img => !used.has(img.storage_path))
    .map(img => img.image_id)

  if (unbindIds.length > 0) {
    await Image.update(
      { reference_id: null },
      { where: { image_id: { [Op.in]: unbindIds } } }
    )
  }

  return { unbound: unbindIds.length }
}

// 将文章全部图片解绑为孤儿（废弃草稿清理用）
async function markPostImagesOrphan(postId) {
  await Image.update(
    { reference_id: null },
    { where: { reference_type: 'post_content', reference_id: postId } }
  )
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
  if (tempId !== path.basename(tempId)) {
    throw new AppError(400, '无效的临时标识');
  }
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
  finalizeTempImages,
  syncPostImages,
  deletePostImages,
  cleanupOldTempDirs,
  ONE_DAY_MS,
  extractReferencedImages,
  unbindUnusedFiles,
  markPostImagesOrphan
}
