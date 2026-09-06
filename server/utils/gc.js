const fs = require('fs').promises
const path = require('path')
const { Op, QueryTypes } = require('sequelize')
const { sequelize, Image, PostImage } = require('@models')
const { deleteImageFiles } = require('@utils/imageStorage')
const { TMP_DIR } = require('@config/image')

// 孤儿图片宽限期：首次确认无引用后 24 小时才物理删除（反悔窗口）
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000
// 文件年龄下限：无论何时被打上孤儿标，创建不足 72 小时的图片绝不物理删除。
// 防"上传后一直没保存进业务表"的图被部署重启触发的 GC 误删（pm2 restart 即跑 GC）
const ORPHAN_MIN_AGE_MS = 72 * 60 * 60 * 1000
// 废弃草稿保留期：draft 状态超过 30 天未更新则清理
const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
// 上传临时文件保留期：multer 落盘文件正常秒级被消费，残留仅来自崩溃/中断
const TMP_MAX_AGE_MS = 60 * 60 * 1000

// 孤儿对账：image 是否被任一业务引用
// 新增持有图片的业务表时，在此追加一行 LEFT JOIN + 对应 IS NULL 判断即可
const ORPHAN_RECONCILE_SQL = `
  SELECT i.image_id AS imageId,
         i.storage_path AS storagePath,
         i.thumb_path AS thumbPath,
         i.orphan_since AS orphanSince,
         i.created_at AS createdAt,
         (p.post_id IS NOT NULL
          OR c.column_id IS NOT NULL
          OR f.friend_link_id IS NOT NULL
          OR pi.post_image_id IS NOT NULL
          OR d.diary_id IS NOT NULL) AS referenced
  FROM image i
  LEFT JOIN post p ON p.cover_image_id = i.image_id
  LEFT JOIN blog_column c ON c.cover_image_id = i.image_id
  LEFT JOIN friend_link f ON f.preview_image_id = i.image_id
  LEFT JOIN post_image pi ON pi.image_id = i.image_id
  LEFT JOIN diary d ON d.cover_image_id = i.image_id
`

// 回收孤儿图片：对账三态处理
// 有引用 → 清除孤儿标记；无引用未标记 → 打标；
// 无引用且标记超宽限期、文件创建超年龄下限 → 物理删除（原图+缩略图）+ 清记录
async function gcOrphanImages() {
  const rows = await sequelize.query(ORPHAN_RECONCILE_SQL, { type: QueryTypes.SELECT })
  const graceCutoff = new Date(Date.now() - ORPHAN_GRACE_MS)
  const ageCutoff = new Date(Date.now() - ORPHAN_MIN_AGE_MS)

  let deleted = 0
  for (const row of rows) {
    const imageId = Number(row.imageId)

    if (row.referenced) {
      if (row.orphanSince) {
        await Image.update(
          { orphan_since: null },
          { where: { image_id: imageId, orphan_since: { [Op.ne]: null } } }
        )
      }
      continue
    }

    if (!row.orphanSince) {
      await Image.update(
        { orphan_since: new Date() },
        { where: { image_id: imageId, orphan_since: null } }
      )
      continue
    }

    // 双条件删除：打标超宽限期 且 文件创建超年龄下限，二者缺一不可
    if (new Date(row.orphanSince) < graceCutoff && new Date(row.createdAt) < ageCutoff) {
      await deleteImageFiles(row.storagePath, row.thumbPath)
      await Image.destroy({ where: { image_id: imageId } })
      deleted++
    }
  }

  if (deleted > 0) {
    console.log(`孤儿图片清理完成，共删除 ${deleted} 张`)
  }
  return deleted
}

// 回收废弃草稿：draft 状态超过保留期则删除
// 仅清理草稿自身与正文图片关联行；图片引用随行消失，由 gcOrphanImages 对账回收
async function gcAbandonedDrafts() {
  const cutoff = new Date(Date.now() - DRAFT_MAX_AGE_MS)
  const drafts = await sequelize.models.Post.findAll({
    where: { post_status: 'draft', updated_at: { [Op.lt]: cutoff } }
  })

  for (const draft of drafts) {
    await sequelize.transaction(async (t) => {
      await PostImage.destroy({ where: { post_id: draft.post_id }, transaction: t })
      await draft.destroy({ transaction: t })
    })
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

// GC 总入口：孤儿对账回收 + 废弃草稿清理 + 上传临时文件兜底
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
  ORPHAN_MIN_AGE_MS,
  DRAFT_MAX_AGE_MS,
  TMP_MAX_AGE_MS,
  ORPHAN_RECONCILE_SQL
}
