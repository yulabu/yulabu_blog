const fs = require('fs').promises
const { Op } = require('sequelize')
const AppError = require('@errors/AppError')
const { Image } = require('@models')
const { deleteImageFiles } = require('@services/image/store')
const { createImageFromUpload } = require('@services/image/upload')
// 引用判定（按类型筛图 / 反查引用位置）的唯一出处在 services/image/refs.js
const { findReferencedImageIds, attachReferences } = require('@services/image/refs')
// 伪类型 'other'（无引用/孤儿）的名字出处在 utils/imageRefTypes.js
const { ORPHAN_TYPE } = require('@utils/imageRefTypes')
const { imageListDTO, imageIdDTO, imageIdsDTO } = require('@dto/image.dto')
const { imageVO, uploadedImageVO } = require('@vo/image.vo')
const { UPLOAD_MAX_TOTAL_SIZE } = require('@config/image')

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
    if (totalSize > UPLOAD_MAX_TOTAL_SIZE) {
      throw new AppError(413, '单次上传总大小不能超过 ' + (UPLOAD_MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(2) + 'MB')
    }

    const images = []
    for (const file of files) {
      images.push(uploadedImageVO(await createImageFromUpload(file.path)))
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

// 图片库列表：分页 + 引用类型筛选（other = 无引用孤儿）
const getImages = async (req, res) => {
  const { page, limit, offset, type } = imageListDTO(req.query)

  const where = {}
  if (type && type !== ORPHAN_TYPE) {
    const ids = await findReferencedImageIds(type)
    if (ids.length === 0) {
      return res.json({ images: [], total: 0, page, totalPages: 0 })
    }
    where.image_id = { [Op.in]: ids }
  } else if (type === ORPHAN_TYPE) {
    const ids = await findReferencedImageIds(ORPHAN_TYPE)
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

  const referenced = await findReferencedImageIds(ORPHAN_TYPE)
  if (referenced.includes(Number(id))) {
    throw new AppError(400, '该图片仍被引用，无法删除')
  }

  await deleteImageFiles(image.storage_path, image.thumb_path)
  await image.destroy()
  res.json({ id, message: '已删除' })
}

// 批量删除（任一被引用则整体拒绝）
const deleteImagesBatch = async (req, res) => {
  const ids = imageIdsDTO(req.body)
  const images = await Image.findAll({ where: { image_id: { [Op.in]: ids } } })
  if (images.length === 0) {
    throw new AppError(404, '图片不存在')
  }

  const referenced = await findReferencedImageIds(ORPHAN_TYPE)
  const boundImages = images.filter(img => referenced.includes(Number(img.image_id)))
  if (boundImages.length > 0) {
    throw new AppError(400, `有 ${boundImages.length} 张图片仍被引用，无法删除`)
  }

  for (const image of images) {
    await deleteImageFiles(image.storage_path, image.thumb_path)
  }
  await Image.destroy({ where: { image_id: { [Op.in]: images.map(img => img.image_id) } } })
  res.json({ count: images.length, message: `已删除 ${images.length} 张图片` })
}

module.exports = { uploadBatch, getImages, getImageById, deleteImage, deleteImagesBatch }
