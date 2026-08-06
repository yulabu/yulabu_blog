const path = require('path')
const fs = require('fs').promises
const AppError = require('@middleware/AppError')
const { UPLOAD_DIR } = require('@config/upload')
const { saveImage } = require('@utils/image')

// 处理新建文章和编辑原文章之间的逻辑
function resolveTargetDir(postId, tempId) {
  if (postId) return path.join(UPLOAD_DIR, String(postId))
  if (tempId) {
    if (!/^[a-zA-Z0-9_-]+$/.test(tempId)) {
      throw new AppError(400, '无效的临时标识')
    }
    return path.join(UPLOAD_DIR, 'temp', tempId)
  }
  throw new AppError(400, '缺少 post_id 或 temp_id')
}

// 批量处理上传的图片，返回存储位置的url
exports.uploadBatch = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError(400, '没有上传文件')
  }

  const postId = req.body.post_id ? Number(req.body.post_id) : null
  const tempId = req.body.temp_id || null
  const targetDir = resolveTargetDir(postId, tempId)

  const urls = []
  // 调用utils中的保存逻辑
  for (const file of req.files) {
    const finalName = await saveImage(file.buffer, targetDir, file.originalname)
    const relative = postId ? String(postId) : `temp/${tempId}`
    urls.push(`/uploads/${relative}/${finalName}`)
  }

  res.json({ urls })
}

// 清理临时上传目录
exports.deleteTemp = async (req, res) => {
  const tempId = req.params.temp_id
  if (!/^[a-zA-Z0-9_-]+$/.test(tempId)) {
    throw new AppError(400, '无效的临时标识')
  }
  const tempDir = path.join(UPLOAD_DIR, 'temp', tempId)
  try {
    await fs.rm(tempDir, { recursive: true, force: true })
  } catch (err) {
    // 目录不存在则忽略
  }
  res.json({ message: '已清理' })
}
