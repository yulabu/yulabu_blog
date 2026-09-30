const { toUploadUrl } = require('@utils/uploadUrl')

function imageVO(image) {
  return {
    id: image.image_id,
    url: toUploadUrl(image.storage_path),
    thumb_url: image.thumb_path ? toUploadUrl(image.thumb_path) : null,
    file_size: image.file_size,
    reference_type: image.reference_type,
    reference_id: image.reference_id,
    reference_title: image.reference_title || null,
    bound: image.reference_id !== null,
    created_at: image.createdAt
  };
}

// 上传接口的返回形状（批量上传的 images[] 与专栏封面的 image 共用）。
// 与 imageVO 的区别是有意的：上传时还没有引用信息，字段就这三个，前端按 UploadedImage 消费
function uploadedImageVO(image) {
  return {
    image_id: image.image_id,
    url: toUploadUrl(image.storage_path),
    thumb_url: image.thumb_path ? toUploadUrl(image.thumb_path) : null
  };
}

module.exports = { imageVO, uploadedImageVO };
