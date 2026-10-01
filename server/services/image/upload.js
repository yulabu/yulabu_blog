// 上传落库（services 层）：转码落盘（store）+ 建 image 元数据记录 + 临时文件收尾。
//
// 两个上传入口共用这里：
//   - 后台批量上传：imageController.uploadBatch → createImagesFromUpload（单请求总量校验 + 顺序落库）
//   - 专栏封面（单张）：columnController.uploadColumnCover → createImageFromUpload
// 改前「saveImageFile → Image.create」在两个 controller 里各抄了一遍，且批量上传的编排
//（fs.stat 总量校验、循环、try/finally）留在 controller——编排与补偿都收在这一层（判据②）。
//
// 响应形状不在这里拼：由 vo/image.vo.js 的 uploadedImageVO 产出（契约 { image_id, url, thumb_url }，
// 前端类型见 frontend/admin/src/types/image.ts 的 UploadedImage）。本模块返回 image 行。
//
// 临时文件的生命周期（三段，各有归属，2026-10 收口）：
//   ① 落盘 = middleware/imageUpload.js（multer diskStorage 落到 UPLOAD_DIR/.tmp）
//   ② 消费后清理 = 本模块的 discardTempFiles（两个入口都经它）
//   ③ 错误路径残留（multer 中途失败、进程崩溃）由 jobs/imageGc.js 的 `.tmp` 兜底（超 1 小时清理）
const fs = require('fs').promises
const { Image } = require('@models')
const { saveImageFile, deleteImageFiles } = require('@services/image/store')
const { UPLOAD_MAX_TOTAL_SIZE } = require('@config/image')
const AppError = require('@errors/AppError')
const { warnTagLine } = require('@utils/log')

async function createImageFromUpload(sourcePath) {
  const info = await saveImageFile(sourcePath)
  try {
    return await Image.create({
      storage_path: info.storagePath,
      thumb_path: info.thumbPath,
      file_size: info.fileSize
    })
  } catch (err) {
    // 补偿（2026-10）：转码已落盘、记录没建成时**回删刚落盘的原图与缩略图**再抛。
    // 不删的话这对文件在 image 表里没有任何记录，GC 的三条路径（image 表 / post 表 / .tmp）都碰不到，
    // 会永久占盘且从库里看不出来（services/image/remove.js 的注释也记着这个盲区）
    await deleteImageFiles(info.storagePath, info.thumbPath)
    console.warn(warnTagLine('image-store', `建记录失败，已回删落盘文件: ${info.storagePath} :: ${err.message}`))
    throw err
  }
}

// 批量上传编排：单请求总量校验 → 顺序落库 → 无论成败都丢弃 .tmp 源文件。返回 image 行数组。
//
// 语义与改前一致：**任一张失败即中断**，已成功的保留下它的 image 行与文件（没有引用 → 图片库短暂可见，
// 由 GC 宽限后回收）；不做「全成全败」——文件是事务管不到的外部资源，而前端 uploadImages 本身是分片上传、
// 失败不回滚也不重试（断点语义见 frontend/admin/src/views/admin/AdminPostEdit.vue 的 handleUploadImages）。
async function createImagesFromUpload(files) {
  try {
    let totalSize = 0
    for (const file of files) {
      totalSize += (await fs.stat(file.path)).size
    }
    if (totalSize > UPLOAD_MAX_TOTAL_SIZE) {
      throw new AppError(413, '单次上传总大小不能超过 ' + (UPLOAD_MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(2) + 'MB')
    }

    const images = []
    for (const file of files) {
      images.push(await createImageFromUpload(file.path))
    }
    return images
  } finally {
    await discardTempFiles(files)
  }
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

module.exports = { createImageFromUpload, createImagesFromUpload, discardTempFiles }
