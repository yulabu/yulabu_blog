const fs = require('fs').promises
const { Op } = require('sequelize')
const AppError = require('@middleware/AppError')
const { saveImageFile, deleteImageFiles } = require('@utils/imageStorage')
const { Image, Post, Column, PostImage, Diary } = require('@models')
const { imageListDTO, imageIdDTO, imageIdsDTO } = require('@dto/image.dto')
const { imageVO } = require('@vo/image.vo')
const { MAX_TOTAL_SIZE } = require('@middleware/imageUpload')

// 批量上传图片：转码落盘 + 写入 image 记录（纯上传，不绑定业务；引用由业务表持有）
const uploadBatch = async (req, res) => {
  const files = req.files
  if (!files || files.length === 0) {
    throw new AppError(400, '没有上传文件')
  }

  try {
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
    for (const file of files) {
      try {
        await fs.unlink(file.path)
      } catch (err) {
        // 忽略单文件清理失败
      }
    }
  }
}

// 指定引用类型的图片 ID 集合；type='other' 返回全部被引用 ID（供差集筛孤儿）
async function findReferencedImageIds(type) {
  if (type === 'post_content') {
    const rows = await PostImage.findAll({ attributes: ['image_id'] })
    return rows.map(r => r.image_id)
  }
  if (type === 'cover') {
    const [posts, columns] = await Promise.all([
      Post.findAll({ where: { cover_image_id: { [Op.ne]: null } }, attributes: ['cover_image_id'] }),
      Column.findAll({ where: { cover_image_id: { [Op.ne]: null } }, attributes: ['cover_image_id'] })
    ])
    return [
      ...posts.map(p => p.cover_image_id),
      ...columns.map(c => c.cover_image_id)
    ]
  }
  if (type === 'diary') {
    const rows = await Diary.findAll({
      where: { cover_image_id: { [Op.ne]: null } },
      attributes: ['cover_image_id']
    })
    return rows.map(r => r.cover_image_id)
  }
  if (type === 'other') {
    const referenced = new Set()
    for (const group of await Promise.all([
      findReferencedImageIds('post_content'),
      findReferencedImageIds('cover'),
      findReferencedImageIds('diary')
    ])) {
      for (const id of group) referenced.add(Number(id))
    }
    return [...referenced]
  }
  return []
}

// 批量派生图片的引用位置（优先级：正文图 > 文章封面 > 专栏封面 > 日记图）
async function attachReferences(images) {
  if (images.length === 0) return
  const ids = images.map(img => img.image_id)

  const [postImages, postCovers, columnCovers, diaryCovers] = await Promise.all([
    PostImage.findAll({
      where: { image_id: { [Op.in]: ids } },
      attributes: ['post_id', 'image_id'],
      order: [['post_image_id', 'ASC']]
    }),
    Post.findAll({ where: { cover_image_id: { [Op.in]: ids } }, attributes: ['post_id', 'post_title', 'cover_image_id'] }),
    Column.findAll({ where: { cover_image_id: { [Op.in]: ids } }, attributes: ['column_id', 'cover_image_id'] }),
    Diary.findAll({ where: { cover_image_id: { [Op.in]: ids } }, attributes: ['diary_id', 'cover_image_id'] })
  ])

  const contentPostByImage = new Map()
  for (const pi of postImages) {
    if (!contentPostByImage.has(pi.image_id)) contentPostByImage.set(pi.image_id, pi.post_id)
  }
  const coverPostByImage = new Map(postCovers.map(p => [p.cover_image_id, p]))
  const coverColumnByImage = new Map(columnCovers.map(c => [c.cover_image_id, c.column_id]))
  const diaryByImage = new Map(diaryCovers.map(d => [d.cover_image_id, d.diary_id]))

  const relatedPostIds = [...new Set([
    ...contentPostByImage.values(),
    ...postCovers.map(p => p.post_id)
  ])]
  const posts = relatedPostIds.length
    ? await Post.findAll({ where: { post_id: { [Op.in]: relatedPostIds } }, attributes: ['post_id', 'post_title'] })
    : []
  const titleById = new Map(posts.map(p => [p.post_id, p.post_title]))

  for (const img of images) {
    if (contentPostByImage.has(img.image_id)) {
      img.reference_type = 'post_content'
      img.reference_id = contentPostByImage.get(img.image_id)
      img.reference_title = titleById.get(img.reference_id) || null
    } else if (coverPostByImage.has(img.image_id)) {
      img.reference_type = 'cover'
      img.reference_id = coverPostByImage.get(img.image_id).post_id
      img.reference_title = coverPostByImage.get(img.image_id).post_title
    } else if (coverColumnByImage.has(img.image_id)) {
      img.reference_type = 'cover'
      img.reference_id = coverColumnByImage.get(img.image_id)
      img.reference_title = null
    } else if (diaryByImage.has(img.image_id)) {
      img.reference_type = 'cover'
      img.reference_id = diaryByImage.get(img.image_id)
      img.reference_title = null
    } else {
      img.reference_type = null
      img.reference_id = null
      img.reference_title = null
    }
  }
}

// 图片库列表：分页 + 引用类型筛选（other = 无引用孤儿）
const getImages = async (req, res) => {
  const { page, limit, offset, type } = imageListDTO(req.query)

  const where = {}
  if (type && type !== 'other') {
    const ids = await findReferencedImageIds(type)
    if (ids.length === 0) {
      return res.json({ images: [], total: 0, page, totalPages: 0 })
    }
    where.image_id = { [Op.in]: ids }
  } else if (type === 'other') {
    const ids = await findReferencedImageIds('other')
    if (ids.length > 0) {
      where.image_id = { [Op.notIn]: ids }
    }
  }

  const { rows, count } = await Image.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset
  })

  await attachReferences(rows)
  res.json({
    images: rows.map(imageVO),
    total: count,
    page,
    totalPages: Math.ceil(count / limit)
  })
}

// 单张图片详情
const getImageById = async (req, res) => {
  const id = imageIdDTO(req.params)
  const image = await Image.findByPk(id)
  if (!image) throw new AppError(404, '图片不存在')

  await attachReferences([image])
  res.json(imageVO(image))
}

// 删除单张图片（仅无引用可删，被引用拒绝）
const deleteImage = async (req, res) => {
  const id = imageIdDTO(req.params)
  const image = await Image.findByPk(id)
  if (!image) throw new AppError(404, '图片不存在')

  const referenced = await findReferencedImageIds('other')
  if (referenced.includes(Number(id))) {
    throw new AppError(400, '该图片仍被引用，无法删除')
  }

  await deleteImageFiles(image.storage_path, image.thumb_path)
  await image.destroy()
  res.json({ message: '已删除' })
}

// 批量删除（任一被引用则整体拒绝）
const deleteImagesBatch = async (req, res) => {
  const ids = imageIdsDTO(req.body)
  const images = await Image.findAll({ where: { image_id: { [Op.in]: ids } } })
  if (images.length === 0) {
    throw new AppError(404, '图片不存在')
  }

  const referenced = await findReferencedImageIds('other')
  const boundImages = images.filter(img => referenced.includes(Number(img.image_id)))
  if (boundImages.length > 0) {
    throw new AppError(400, `有 ${boundImages.length} 张图片仍被引用，无法删除`)
  }

  for (const image of images) {
    await deleteImageFiles(image.storage_path, image.thumb_path)
  }
  await Image.destroy({ where: { image_id: { [Op.in]: images.map(img => img.image_id) } } })
  res.json({ message: `已删除 ${images.length} 张图片` })
}

module.exports = { uploadBatch, getImages, getImageById, deleteImage, deleteImagesBatch }
