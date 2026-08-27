const fs = require('fs').promises
const path = require('path')
const { Op } = require('sequelize')
const { Image, Post } = require('@models')
const { deleteImageFiles } = require('@utils/imageStorage')
const { markPostImagesOrphan } = require('@utils/image')
const { TMP_DIR } = require('@config/image')

// 孤儿图片宽限期：解绑后 24 小时才物理删除（反悔窗口）
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000
// 废弃草稿保留期：draft 状态超过 30 天未更新则清理
const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
// 上传临时文件保留期：multer 落盘文件正常秒级被消费，残留仅来自崩溃/中断
const TMP_MAX_AGE_MS = 60 * 60 * 1000

// 回收孤儿图片：解绑超过宽限期后物理删除（原图+缩略图）并清理记录
async function gcOrphanImages() {
  const cutoff = new Date(Date.now() - ORPHAN_GRACE_MS)
  const orphans = await Image.findAll({
    where: { reference_id: null, updated_at: { [Op.lt]: cutoff } }
  })

  for (const image of orphans) {
    await deleteImageFiles(image.storage_path, image.thumb_path)
    await image.destroy()
  }

  if (orphans.length > 0) {
    console.log(`孤儿图片清理完成，共删除 ${orphans.length} 张`)
  }
  return orphans.length
}

// 回收废弃草稿：draft 状态超过保留期则删除，其图片全部解绑进孤儿流程
async function gcAbandonedDrafts() {
  const cutoff = new Date(Date.now() - DRAFT_MAX_AGE_MS)
  const drafts = await Post.findAll({
    where: { post_status: 'draft', updated_at: { [Op.lt]: cutoff } }
  })

  for (const draft of drafts) {
    await markPostImagesOrphan(draft.post_id)
    await draft.destroy()
  }

  if (drafts.length > 0) {
    console.log(`废弃草稿清理完成，共删除 ${drafts.length} 篇`)
  }
  return drafts.length
}

// 清理过期上传临时文件：.tmp 下超过保留期的文件物理删除（单个失败忽略）
async function cleanupOldTmpFiles() {
  let files
  try {
    files = await fs.readdir(TMP_DIR)
  } catch (err) {
    return 0
  }

  const cutoff = Date.now() - TMP_MAX_AGE_MS
  let removed = 0

  for (const name of files) {
    const filePath = path.join(TMP_DIR, name)
    try {
      const stat = await fs.stat(filePath)
      if (stat.isFile() && stat.mtimeMs < cutoff) {
        await fs.unlink(filePath)
        removed++
      }
    } catch (err) {
      // 忽略单个文件失败，继续处理其余文件
    }
  }

  if (removed > 0) {
    console.log(`临时文件清理完成，共删除 ${removed} 个`)
  }
  return removed
}

// GC 总入口：孤儿回收 + 废弃草稿清理 + 上传临时文件兜底
async function runGC() {
  const orphans = await gcOrphanImages()
  const drafts = await gcAbandonedDrafts()
  const tmpFiles = await cleanupOldTmpFiles()
  return { orphans, drafts, tmpFiles }
}

module.exports = {
  gcOrphanImages,
  gcAbandonedDrafts,
  cleanupOldTmpFiles,
  runGC,
  ORPHAN_GRACE_MS,
  DRAFT_MAX_AGE_MS,
  TMP_MAX_AGE_MS
}