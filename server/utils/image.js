const { Op } = require('sequelize')
const { sequelize, Image, PostImage } = require('@models')

// URL → uploads 存储 key 归一化（所有引用派生的唯一入口）
// 兼容：相对路径 /uploads/...、本站任意绝对域名、协议相对 //host/...；
// &amp; 实体还原；query/hash 丢弃（URL API 只取 pathname）。
// 不校验 host：任意域名的 /uploads/ 路径都接受，能否建立引用由
// image.storage_path 精确匹配把关——域名白名单在换域名/走 IP 访问时会
// 静默失效，而"派生失败 → GC 误删"正是要消灭的故障模式。
function storageKeyFromUrl(url) {
  if (!url) return null
  try {
    const parsed = new URL(String(url).trim().replace(/&amp;/g, '&'), 'https://yulabu.cn')
    if (!parsed.pathname.startsWith('/uploads/')) return null
    return decodeURIComponent(parsed.pathname.slice('/uploads/'.length)) || null
  } catch (err) {
    return null
  }
}

// 从正文中提取本系统图片的存储 key 集合（去重）
// 支持 Markdown 图片语法与 <img> 标签；URL 统一走 storageKeyFromUrl 归一化
function extractReferencedImages(content) {
  const refs = new Set()
  if (!content) return refs

  // Markdown：URL 捕获组排除空白，兼容 "title" / 'title' 后缀与 <url> 包裹形式，
  // 否则 title 会被并进 URL 导致派生失败（图显示着却被 GC 当孤儿回收）
  const patterns = [
    /!\[[^\]]*\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g,
    /<img\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi
  ]

  for (const regex of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      const raw = match[1]
      const url = raw.startsWith('<') && raw.endsWith('>') ? raw.slice(1, -1) : raw
      const key = storageKeyFromUrl(url)
      if (key) refs.add(key)
    }
  }

  return refs
}

// 存储 key 集合 → 图片 ID 列表（保持传入顺序、去重；不存在的 key 跳过）
// warnContext 传入时（如 post#3），未命中 image 表的本站引用会打告警：
// 这类引用建立不了指针，图片会在 GC 宽限后被物理删除，属于必须当场暴露的静默失败
async function resolveImageIdsByKeys(keys, warnContext) {
  const list = [...new Set(keys || [])].filter(Boolean)
  if (list.length === 0) return []

  const images = await Image.findAll({
    where: { storage_path: { [Op.in]: list } },
    attributes: ['image_id', 'storage_path']
  })
  const idByKey = new Map(images.map(img => [img.storage_path, img.image_id]))

  if (warnContext) {
    const missing = list.filter(key => !idByKey.has(key))
    if (missing.length > 0) {
      console.warn(`[image-ref] [${warnContext}] ${missing.length} 个本站图片引用未命中 image 表（可能已被 GC 回收或 URL 有误）: ${missing.join(', ')}`)
    }
  }

  return list.map(key => idByKey.get(key)).filter(Boolean)
}

// URL 列表 → 本系统图片 ID 列表（保持传入顺序、去重；外链或 image 表中不存在的 URL 跳过）
async function resolveImageIdsByUrls(urls, warnContext) {
  const keys = (urls || []).map(storageKeyFromUrl).filter(Boolean)
  return resolveImageIdsByKeys(keys, warnContext)
}

// 单个图片 URL → image_id（外链或无效返回 null）
// 当前所有调用点都是封面派生（post/column/diary），告警上下文统一标"封面"
async function resolveImageIdByUrl(url) {
  const ids = await resolveImageIdsByUrls(url ? [url] : [], '封面')
  return ids[0] || null
}

// 同步文章正文图片关联：以正文为真相源全量 replace（幂等），返回关联图片数
async function syncPostImages(postId, content) {
  const imageIds = await resolveImageIdsByKeys(extractReferencedImages(content), `post#${postId}`)

  await sequelize.transaction(async (t) => {
    await PostImage.destroy({ where: { post_id: postId }, transaction: t })
    if (imageIds.length > 0) {
      await PostImage.bulkCreate(
        imageIds.map(id => ({ post_id: postId, image_id: id })),
        { transaction: t }
      )
    }
  })

  return imageIds.length
}

module.exports = {
  storageKeyFromUrl,
  extractReferencedImages,
  resolveImageIdsByKeys,
  resolveImageIdsByUrls,
  resolveImageIdByUrl,
  syncPostImages
}
