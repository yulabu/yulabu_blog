const { Op } = require('sequelize')
const AppError = require('@errors/AppError')
const { Image } = require('@models')
// 上传落库 + 批量编排 + 临时文件清理的归属见该文件头注
const { createImagesFromUpload } = require('@services/image/upload')
// 引用判定（按类型筛图 / 反查引用位置）的唯一出处在 services/image/refs.js
const { findReferencedImageIds, attachReferences } = require('@services/image/refs')
// 删图（引用守卫 + 先事务删行再删文件）在 services/image/remove.js（判据②）
const { deleteUnreferencedImages } = require('@services/image/remove')
// 伪类型 'other'（无引用/孤儿）的名字出处在 utils/imageRefTypes.js
const { ORPHAN_TYPE } = require('@utils/imageRefTypes')
const { imageListDTO, imageIdDTO, imageIdsDTO } = require('@dto/image.dto')
const { imageVO, uploadedImageVO } = require('@vo/image.vo')

// 批量上传图片：编排（总量校验 / 顺序落库 / 临时文件收尾 / 失败回删）都在 services/image/upload.js（判据②）。
// 这里只做「有没有文件」的请求级检查 → 调 service → 用唯一形状出处 uploadedImageVO 组装响应
const uploadBatch = async (req, res) => {
  const files = req.files
  if (!files || files.length === 0) {
    throw new AppError(400, '没有上传文件')
  }

  const images = await createImagesFromUpload(files)
  res.json({ images: images.map(uploadedImageVO) })
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

// 删除单张图片（仅无引用可删，被引用拒绝）——守卫与「先删行后删文件」在 service
const deleteImage = async (req, res) => {
  const id = imageIdDTO(req.params)
  await deleteUnreferencedImages([id])
  res.json({ id, message: '已删除' })
}

// 批量删除（任一被引用则整体拒绝）
const deleteImagesBatch = async (req, res) => {
  const ids = imageIdsDTO(req.body)
  const count = await deleteUnreferencedImages(ids)
  res.json({ count, message: `已删除 ${count} 张图片` })
}

module.exports = { uploadBatch, getImages, getImageById, deleteImage, deleteImagesBatch }
