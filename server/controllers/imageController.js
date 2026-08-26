const fs = require('fs').promises
const AppError = require('@middleware/AppError')
const { saveImageFile } = require('@utils/imageStorage')
const { Image, Post } = require('@models')
const { MAX_TOTAL_SIZE } = require('@middleware/imageUpload')

// 批量上传图片：转码落盘 + 写入 Image 记录（绑定 post），返回图片信息
exports.uploadBatch = async (req, res) => {
  const files = req.files
  if (!files || files.length === 0) {
    throw new AppError(400, '没有上传文件')
  }

  try {
    const postId = Number(req.body.post_id)
    if (!postId || postId < 1) {
      throw new AppError(400, '缺少有效的 post_id')
    }

    const post = await Post.findByPk(postId)
    if (!post) {
      throw new AppError(400, '关联的文章不存在')
    }

    // 单请求总量限制
    let totalSize = 0
    for (const file of files) {
      totalSize += (await fs.stat(file.path)).size
    }
    if (totalSize > MAX_TOTAL_SIZE) {
      throw new AppError(413, '单次上传总大小不能超过 ' + (MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(2) + 'MB')
    }

    const images = []
    for (const file of files) {
      const info = await saveImageFile(file.path)
      const record = await Image.create({
        reference_type: 'post_content',
        reference_id: postId,
        storage_path: info.storagePath,
        thumb_path: info.thumbPath,
        file_size: info.fileSize
      })
      images.push({
        image_id: record.image_id,
        url: `/uploads/${info.storagePath}`,
        thumb_url: `/uploads/${info.thumbPath}`
      })
    }

    res.json({ images })
  } finally {
    // 清理本请求 multer 落盘的临时文件（逐个删除，防并发误删他人文件）
    for (const file of files) {
      try {
        await fs.unlink(file.path)
      } catch (err) {
        // 忽略单文件清理失败
      }
    }
  }
}