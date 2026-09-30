// 上传落库：转码落盘（store）+ 建 image 元数据记录。
// 两个上传入口（后台批量上传 imageController.uploadBatch、专栏封面 columnController.uploadColumnCover）
// 共用这一步——改前各自抄了一遍「saveImageFile → Image.create」，任一处漏改就会出现两种记录形状。
// 响应形状不在这里拼：由 vo/image.vo.js 的 uploadedImageVO 产出（契约 { image_id, url, thumb_url }，
// 前端类型见 frontend/admin/src/types/api.ts 的 UploadedImage）。
const { Image } = require('@models')
const { saveImageFile } = require('@services/image/store')

async function createImageFromUpload(sourcePath) {
  const info = await saveImageFile(sourcePath)
  return Image.create({
    storage_path: info.storagePath,
    thumb_path: info.thumbPath,
    file_size: info.fileSize
  })
}

module.exports = { createImageFromUpload }
