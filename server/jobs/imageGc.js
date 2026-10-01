// 图片维护任务（job）：孤儿图片回收 + 废弃草稿清理 + 上传临时文件兜底。
// 由 jobs/index.js 注册（启动即跑、此后每 24 小时）；也可手工触发：node scripts/gc.js
// 策略常量（宽限期/保留期）留在本文件——外部不能配、只有本任务用，按 config 判据不进 config/
const fs = require('fs').promises
const path = require('path')
const { Op, QueryTypes } = require('sequelize')
const { sequelize, Post, Image, PostImage } = require('@models')
const { deleteImageFiles } = require('@services/image/store')
const { TMP_DIR } = require('@config/image')
// 孤儿对账 SQL 的唯一出处在 services/image/refs.js（与后台图片库的引用判定同源）；
// 删除前的新鲜引用集合同样从它取（快照与删除之间可能有保存操作新建引用）
const { ORPHAN_RECONCILE_SQL, findReferencedImageIds } = require('@services/image/refs')
const { ORPHAN_TYPE } = require('@utils/imageRefTypes')
const { infoLine, errTagLine } = require('@utils/log')

// 孤儿图片宽限期：首次确认无引用后 24 小时才物理删除（反悔窗口）
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000
// 文件年龄下限：无论何时被打上孤儿标，创建不足 72 小时的图片绝不物理删除。
// 防"上传后一直没保存进业务表"的图被部署重启触发的 GC 误删（pm2 restart 即跑 GC）
const ORPHAN_MIN_AGE_MS = 72 * 60 * 60 * 1000
// 废弃草稿保留期：draft 状态超过 30 天未更新则清理
const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
// 上传临时文件保留期：multer 落盘文件正常秒级被消费，残留仅来自崩溃/中断
const TMP_MAX_AGE_MS = 60 * 60 * 1000

// 回收孤儿图片：对账三态处理
// 有引用 → 清除孤儿标记；无引用未标记 → 打标；
// 无引用且标记超宽限期、文件创建超年龄下限 → **写前重查引用**后物理删除（原图+缩略图）+ 清记录。
//
// 写前重查（2026-10 加）：对账是一次读快照，随后逐行写。快照与删除之间用户可能刚把某张图重新
// 引用回去（保存文章/专栏/日记），改前会把它删掉——现在删除阶段先取一次新鲜引用集合，
// 候选若已被引用就打回未标记并跳过删除。
async function gcOrphanImages() {
  const rows = await sequelize.query(ORPHAN_RECONCILE_SQL, { type: QueryTypes.SELECT })
  const graceCutoff = new Date(Date.now() - ORPHAN_GRACE_MS)
  const ageCutoff = new Date(Date.now() - ORPHAN_MIN_AGE_MS)

  const candidates = []
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
      candidates.push(row)
    }
  }

  let deleted = 0
  let revived = 0
  if (candidates.length > 0) {
    // 新鲜引用集合（一次查询）：把「快照后被重新引用」的候选项救回来
    const referencedNow = new Set(await findReferencedImageIds(ORPHAN_TYPE))

    for (const row of candidates) {
      const imageId = Number(row.imageId)
      if (referencedNow.has(imageId)) {
        await Image.update(
          { orphan_since: null },
          { where: { image_id: imageId, orphan_since: { [Op.ne]: null } } }
        )
        revived++
        continue
      }
      await deleteImageFiles(row.storagePath, row.thumbPath)
      await Image.destroy({ where: { image_id: imageId } })
      deleted++
    }
  }

  if (revived > 0) {
    console.log(infoLine('image-gc', `${revived} 张候选项在对账后被重新引用，已跳过删除并清除孤儿标记`))
  }
  if (deleted > 0) {
    console.log(infoLine('image-gc', `孤儿图片清理完成，共删除 ${deleted} 张`))
  }
  return deleted
}

// 回收废弃草稿：draft 状态超过保留期则删除
// 仅清理草稿自身与正文图片关联行；图片引用随行消失，由 gcOrphanImages 对账回收。
// 写前重查（2026-10 加）：快照之后草稿可能刚被恢复/编辑（用户救回来了）——逐篇重读一次再删
async function gcAbandonedDrafts() {
  const cutoff = new Date(Date.now() - DRAFT_MAX_AGE_MS)
  const drafts = await Post.findAll({
    where: { post_status: 'draft', updated_at: { [Op.lt]: cutoff } }
  })

  let deleted = 0
  let skipped = 0
  for (const draft of drafts) {
    const fresh = await Post.findByPk(draft.post_id)
    if (!fresh || fresh.post_status !== 'draft' || new Date(fresh.updated_at) >= cutoff) {
      skipped++
      continue
    }

    await sequelize.transaction(async (t) => {
      await PostImage.destroy({ where: { post_id: fresh.post_id }, transaction: t })
      await fresh.destroy({ transaction: t })
    })
    deleted++
  }

  if (skipped > 0) {
    console.log(infoLine('image-gc', `${skipped} 篇候选草稿在对账后被改动，已跳过`))
  }
  if (deleted > 0) {
    console.log(infoLine('image-gc', `废弃草稿清理完成，共删除 ${deleted} 篇`))
  }
  return deleted
}

// 清理过期上传临时文件：.tmp 下超过保留期的文件物理删除（单个失败忽略）
async function cleanupOldTmpFiles() {
  let files
  try {
    files = await fs.readdir(TMP_DIR)
  } catch (err) {
    // ENOENT = 临时目录还不存在（只有过上传才有），属正常；其它错误必须留痕：
    // 本函数返回 0，而 runImageGc 只在三项有值时打日志，
    // 所以读取失败会表现为「临时文件清理长期静默失效」
    if (err.code !== 'ENOENT') {
      console.error(errTagLine('image-gc', `临时文件清理失败：无法读取 ${TMP_DIR} :: ${err.message}`))
    }
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
    console.log(infoLine('image-gc', `临时文件清理完成，共删除 ${removed} 个`))
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

// 定时执行入口（注册表调用）：进度日志与失败日志都在这里（改前在 app.js 的 runGCSafe 里）。
// 三项都为 0 时不打日志——这是每 24 小时的常驻任务，安静即正常
async function runImageGc() {
  try {
    const { orphans, drafts, tmpFiles } = await runGC()
    if (orphans || drafts || tmpFiles) {
      console.log(infoLine('image-gc', `GC 完成：孤儿图片 ${orphans} 张，废弃草稿 ${drafts} 篇，临时文件 ${tmpFiles} 个`))
    }
    return true
  } catch (err) {
    console.error(`${errTagLine('image-gc', 'GC 失败')}\n${err.stack || ''}`)
    return false
  }
}

module.exports = {
  gcOrphanImages,
  gcAbandonedDrafts,
  cleanupOldTmpFiles,
  runGC,
  runImageGc,
  ORPHAN_GRACE_MS,
  ORPHAN_MIN_AGE_MS,
  DRAFT_MAX_AGE_MS,
  TMP_MAX_AGE_MS
}
