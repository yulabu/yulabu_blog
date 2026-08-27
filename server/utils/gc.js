const { Op } = require('sequelize')
const { Image, Post } = require('@models')
const { deleteImageFiles } = require('@utils/imageStorage')
const { markPostImagesOrphan } = require('@utils/image')

// 孤儿图片宽限期：解绑后 24 小时才物理删除（反悔窗口）
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000
// 废弃草稿保留期：draft 状态超过 30 天未更新则清理
const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

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

// GC 总入口：孤儿回收 + 废弃草稿清理
async function runGC() {
  const orphans = await gcOrphanImages()
  const drafts = await gcAbandonedDrafts()
  return { orphans, drafts }
}

module.exports = {
  gcOrphanImages,
  gcAbandonedDrafts,
  runGC,
  ORPHAN_GRACE_MS,
  DRAFT_MAX_AGE_MS
}