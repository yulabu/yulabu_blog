const fs = require('fs').promises
const { Op } = require('sequelize')
const AppError = require('@middleware/AppError')
const { saveImageFile, deleteImageFiles } = require('@utils/imageStorage')
const { Image, Post } = require('@models')
const { imageListDTO, imageIdDTO, imageIdsDTO } = require('@dto/image.dto')
const { imageVO } = require('@vo/image.vo')
const { MAX_TOTAL_SIZE } = require('@middleware/imageUpload')

// 批量上传图片（文章专用）：转码落盘 + 写入 Image 记录（绑定 post），返回图片信息
// type 参数：post_content（默认，正文图）/ cover（文章封面）；两类型均绑定 post
const UPLOAD_TYPES = ['post_content', 'cover']

exports.uploadBatch = async (req, res) => {
  const files = req.files
  if (!files || files.length === 0) {
    throw new AppError(400, '没有上传文件')
  }

  try {
    const type = req.body.type || 'post_content'
    if (!UPLOAD_TYPES.includes(type)) {
      throw new AppError(400, '不支持的引用类型')
    }

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
        reference_type: type,
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

// 为图片补充引用文章标题（reference_type=post_content 时）
// 同一查找确认文章id，避免逐条带来的开销
async function attachReferenceTitles(images) {
  const postIds = [...new Set(
    images
      .filter(img => img.reference_type === 'post_content' && img.reference_id)
      .map(img => img.reference_id)
  )]
  // 无数据提前退出
  if (postIds.length === 0) return

  const posts = await Post.findAll({
    where: { post_id: { [Op.in]: postIds } },
    attributes: ['post_id', 'post_title']
  })
  const titleMap = new Map(posts.map(p => [p.post_id, p.post_title]))

  for (const img of images) {
    if (img.reference_type === 'post_content' && img.reference_id) {
      img.reference_title = titleMap.get(img.reference_id) || null
    }
  }
}

// 图片库列表：分页 + 分类筛选，附引用文章标题
exports.getImages = async (req, res) => {
  const { page, limit, offset, type } = imageListDTO(req.query)

  const where = {}
  if (type) where.reference_type = type

  const { rows, count } = await Image.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset
  })

  await attachReferenceTitles(rows)
  res.json({
    images: rows.map(imageVO),
    total: count,
    page,
    totalPages: Math.ceil(count / limit)
  })
}

// 单张图片详情
exports.getImageById = async (req, res) => {
  const id = imageIdDTO(req.params)
  const image = await Image.findByPk(id)
  if (!image) throw new AppError(404, '图片不存在')

  await attachReferenceTitles([image])
  res.json(imageVO(image))
}

// 删除单张图片（仅孤儿可删，被引用拒绝）
exports.deleteImage = async (req, res) => {
  const id = imageIdDTO(req.params)
  const image = await Image.findByPk(id)
  if (!image) throw new AppError(404, '图片不存在')
  if (image.reference_id !== null) {
    throw new AppError(400, '该图片仍被引用，无法删除')
  }

  await deleteImageFiles(image.storage_path, image.thumb_path)
  await image.destroy()
  res.json({ message: '已删除' })
}

// 批量删除（任一被引用则整体拒绝）
exports.deleteImagesBatch = async (req, res) => {
  const ids = imageIdsDTO(req.body)
  const images = await Image.findAll({ where: { image_id: { [Op.in]: ids } } })

  const bound = images.filter(img => img.reference_id !== null)
  if (bound.length > 0) {
    throw new AppError(400, `有 ${bound.length} 张图片仍被引用，无法删除`)
  }

  for (const image of images) {
    await deleteImageFiles(image.storage_path, image.thumb_path)
  }
  await Image.destroy({ where: { image_id: { [Op.in]: images.map(img => img.image_id) } } })
  res.json({ message: `已删除 ${images.length} 张图片` })
}