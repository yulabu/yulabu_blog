// 上传落库：转码落盘（store）+ 建 image 元数据记录。
// 两个上传入口（后台批量上传 imageController.uploadBatch、专栏封面 columnController.uploadColumnCover）
// 共用这一步——改前各自抄了一遍「saveImageFile → Image.create」，任一处漏改就会出现两种记录形状。
// 响应形状不在这里拼：由 vo/image.vo.js 的 uploadedImageVO 产出（契约 { image_id, url, thumb_url }，
// 前端类型见 frontend/admin/src/types/api.ts 的 UploadedImage）。
//
// 临时文件的生命周期（三段，各有归属，2026-10 收口）：
//   ① 落盘 = middleware/imageUpload.js（multer diskStorage 落到 UPLOAD_DIR/.tmp）
//   ② 消费后清理 = 各上传入口调 discardTempFiles（改前两个 controller 各写一遍 try/finally + unlink）
//   ③ 错误路径残留（multer 中途失败、进程崩溃）由 jobs/imageGc.js 的 `.tmp` 兜底（超 1 小时清理）
const fs = require('fs').promises
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

// 丢弃 multer 落盘的临时文件（业务已消费或失败收尾）。单文件失败只忽略——
// 残留在 .tmp 里的由 GC 兜底，不值得为此让请求报错
async function discardTempFiles(files) {
  for (const file of files || []) {
    try {
      await fs.unlink(file.path)
    } catch (err) {
      // 忽略单文件清理失败（GC 兜底）
    }
  }
}

module.exports = { createImageFromUpload, discardTempFiles }
