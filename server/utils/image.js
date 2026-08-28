const { Op } = require('sequelize')
const { Image, Post } = require('@models')

// 从正文中提取本系统图片的存储 key 集合（去重）
// 支持 Markdown 图片语法与 <img> 标签，只匹配 /uploads/ 开头的相对路径
function extractReferencedImages(content) {
  const refs = new Set()
  if (!content) return refs

  const patterns = [
    /!\[[^\]]*\]\(([^)]+)\)/g,
    /<img\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi
  ]

  for (const regex of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      const url = match[1]
      if (url.startsWith('/uploads/')) {
        try {
          const key = decodeURIComponent(url.slice('/uploads/'.length))
          if (key) refs.add(key)
        } catch (err) {
          // 忽略无法解码的 URL
        }
      }
    }
  }

  return refs
}

// 差集解绑：将绑定到文章但正文中已不引用的图片置为孤儿（reference_id = NULL）
// 幂等：重复调用（保存 + 离开兜底）无副作用
// 保护窗口：绑定后 GRACE 内的图片不解绑——粘贴/拖拽上传与正文插入 URL 存在
// 异步时序窗口，保存时正文可能暂未引用该图，留待窗口过后再进差集，避免误伤。
const UNBIND_GRACE_MS = 60 * 1000

async function unbindUnusedFiles(postId) {
  const post = await Post.findByPk(postId)
  if (!post) return { unbound: 0 }

  const used = extractReferencedImages(post.post_content)
  const bound = await Image.findAll({
    where: { reference_type: 'post_content', reference_id: postId }
  })

  const graceCutoff = new Date(Date.now() - UNBIND_GRACE_MS)
  const unbindIds = bound
    .filter(img => !used.has(img.storage_path))
    .filter(img => img.createdAt <= graceCutoff)
    .map(img => img.image_id)

  if (unbindIds.length > 0) {
    await Image.update(
      { reference_id: null },
      { where: { image_id: { [Op.in]: unbindIds } } }
    )
  }

  return { unbound: unbindIds.length }
}

// 将文章全部图片解绑为孤儿（废弃草稿清理用）
async function markPostImagesOrphan(postId) {
  await Image.update(
    { reference_id: null },
    { where: { reference_type: 'post_content', reference_id: postId } }
  )
}

// 封面差集解绑：post_cover 未引用的 cover 图置为孤儿
// 无保护窗口：封面上传后未保存视为放弃（孤儿由 24h GC 回收）
// 外链/null 视为未引用（全部解绑）；幂等
async function unbindCover(postId, coverUrl) {
  const usedKey = coverUrl && coverUrl.startsWith('/uploads/')
    ? decodeURIComponent(coverUrl.slice('/uploads/'.length))
    : null

  const bound = await Image.findAll({
    where: { reference_type: 'cover', reference_id: postId }
  })

  const unbindIds = bound
    .filter(img => img.storage_path !== usedKey)
    .map(img => img.image_id)

  if (unbindIds.length > 0) {
    await Image.update(
      { reference_id: null },
      { where: { image_id: { [Op.in]: unbindIds } } }
    )
  }

  return { unbound: unbindIds.length }
}

module.exports = {
  extractReferencedImages,
  unbindUnusedFiles,
  markPostImagesOrphan,
  unbindCover,
  UNBIND_GRACE_MS
}