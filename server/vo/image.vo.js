const { toUploadUrl } = require('@utils/uploadUrl')

// 引用三件套（reference_type / reference_id / reference_title）由 services/image/refs.js 的
// attachReferences 注入到模型实例上——凡是输出图片列表/详情的调用方都必须先调它。
// 这里按「可能未注入」防御取值：改前 `bound: reference_id !== null` 在未注入时
// （undefined !== null 为 true）会把没引用的图报成已绑定
function imageVO(image) {
  return {
    id: image.image_id,
    url: toUploadUrl(image.storage_path),
    thumb_url: image.thumb_path ? toUploadUrl(image.thumb_path) : null,
    file_size: image.file_size,
    reference_type: image.reference_type || null,
    reference_id: image.reference_id ?? null,
    reference_title: image.reference_title || null,
    bound: Boolean(image.reference_id),
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
