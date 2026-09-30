// 图片引用账本（唯一出处）：回答「这张图被谁引用」以及「某类引用涉及哪些图」。
//
// 为什么要有这个模块：改前这条事实散在两处——GC 的 ORPHAN_RECONCILE_SQL（LEFT JOIN 四张表）
// 与 imageController 的 findReferencedImageIds/attachReferences（Sequelize 各写一遍同样的表清单），
// 新增持图业务时必须同时改两处，漏改一处就会把「在用的图」判成孤儿并物理删除。
// 现在两处都从下面这份 REFERENCE_SOURCES 派生：**新增持图业务只改这一张清单**。
//
// 三种查询形态共用同一份清单：
//   ① 孤儿对账（GC，一次扫全表）—— ORPHAN_RECONCILE_SQL 由清单拼出
//   ② 按类型取引用图 id（后台图片库筛选）—— findReferencedImageIds 由清单派生
//   ③ 反查引用位置（后台展示「用在哪」）—— attachReferences 的优先级链是显式代码：
//      它只影响列表里显示哪一个引用标签，不参与回收判定（漏了不会删错图）
const { Op } = require('sequelize')
const { sequelize, Post, Column, PostImage, Diary } = require('@models')

// 持图清单。字段含义：
//   table / imageColumn   业务表里指向 image 的列（1:1 封面类）
//   pkColumn              该表主键（SQL 里判「这一行存在」用）
//   filterType            后台图片库按类型筛选时归入哪一类（'other' 取全部并集）
//   model / idAttr        ② 用的 Sequelize 模型与主键属性名
// 顺序即 SQL 的 JOIN 顺序（保持与原 SQL 逐字一致的连接次序，便于对账）
const REFERENCE_SOURCES = [
  { table: 'post', imageColumn: 'cover_image_id', pkColumn: 'post_id', filterType: 'cover', model: Post, idAttr: 'post_id' },
  { table: 'blog_column', imageColumn: 'cover_image_id', pkColumn: 'column_id', filterType: 'cover', model: Column, idAttr: 'column_id' },
  { table: 'post_image', imageColumn: 'image_id', pkColumn: 'post_image_id', filterType: 'post_content', model: PostImage, idAttr: 'post_image_id' },
  { table: 'diary', imageColumn: 'cover_image_id', pkColumn: 'diary_id', filterType: 'diary', model: Diary, idAttr: 'diary_id' }
]

// 孤儿对账 SQL：image 全表 + 各持图表的 LEFT JOIN，referenced = 任一来源命中
// 注意：一个 image 被多处引用时会出多行（LEFT JOIN 放大），这是既有行为，调用方按幂等处理
const _joins = REFERENCE_SOURCES
  .map((s, i) => `  LEFT JOIN ${s.table} src${i} ON src${i}.${s.imageColumn} = i.image_id`)
  .join('\n')
const _referenced = REFERENCE_SOURCES
  .map((s, i) => `src${i}.${s.pkColumn} IS NOT NULL`)
  .join('\n          OR ')
const ORPHAN_RECONCILE_SQL = `
  SELECT i.image_id AS imageId,
         i.storage_path AS storagePath,
         i.thumb_path AS thumbPath,
         i.orphan_since AS orphanSince,
         i.created_at AS createdAt,
         (${_referenced}) AS referenced
  FROM image i
${_joins}
`

// 指定引用类型的图片 ID 集合；type='other' 返回全部被引用 ID（供差集筛孤儿）
// 归类比对：post_image → post_content，post/blog_column → cover，diary → diary
async function findReferencedImageIds(type) {
  const sources = type === 'other'
    ? REFERENCE_SOURCES
    : REFERENCE_SOURCES.filter(s => s.filterType === type)
  if (sources.length === 0) return []

  // 每个来源一次查询（并列）；列名跟着行一起带出来，聚合时才知道该读哪一列
  const groups = await Promise.all(sources.map(async s => ({
    column: s.imageColumn,
    rows: await s.model.findAll({
      where: { [s.imageColumn]: { [Op.ne]: null } },
      attributes: [s.imageColumn]
    })
  })))

  const ids = new Set()
  for (const { column, rows } of groups) {
    for (const row of rows) {
      const id = row[column]
      if (id !== null && id !== undefined) ids.add(Number(id))
    }
  }
  return [...ids]
}

// 批量派生图片的引用位置（优先级：正文图 > 文章封面 > 专栏封面 > 日记图）
async function attachReferences(images) {
  if (images.length === 0) return
  const ids = images.map(img => img.image_id)

  const [postImages, postCovers, columnCovers, diaryCovers] = await Promise.all([
    PostImage.findAll({
      where: { image_id: { [Op.in]: ids } },
      attributes: ['post_id', 'image_id'],
      order: [['post_image_id', 'ASC']]
    }),
    Post.findAll({ where: { cover_image_id: { [Op.in]: ids } }, attributes: ['post_id', 'post_title', 'cover_image_id'] }),
    Column.findAll({ where: { cover_image_id: { [Op.in]: ids } }, attributes: ['column_id', 'cover_image_id'] }),
    Diary.findAll({ where: { cover_image_id: { [Op.in]: ids } }, attributes: ['diary_id', 'cover_image_id'] })
  ])

  const contentPostByImage = new Map()
  for (const pi of postImages) {
    if (!contentPostByImage.has(pi.image_id)) contentPostByImage.set(pi.image_id, pi.post_id)
  }
  const coverPostByImage = new Map(postCovers.map(p => [p.cover_image_id, p]))
  const coverColumnByImage = new Map(columnCovers.map(c => [c.cover_image_id, c.column_id]))
  const diaryByImage = new Map(diaryCovers.map(d => [d.cover_image_id, d.diary_id]))

  const relatedPostIds = [...new Set([
    ...contentPostByImage.values(),
    ...postCovers.map(p => p.post_id)
  ])]
  const posts = relatedPostIds.length
    ? await Post.findAll({ where: { post_id: { [Op.in]: relatedPostIds } }, attributes: ['post_id', 'post_title'] })
    : []
  const titleById = new Map(posts.map(p => [p.post_id, p.post_title]))

  for (const img of images) {
    if (contentPostByImage.has(img.image_id)) {
      img.reference_type = 'post_content'
      img.reference_id = contentPostByImage.get(img.image_id)
      img.reference_title = titleById.get(img.reference_id) || null
    } else if (coverPostByImage.has(img.image_id)) {
      img.reference_type = 'cover'
      img.reference_id = coverPostByImage.get(img.image_id).post_id
      img.reference_title = coverPostByImage.get(img.image_id).post_title
    } else if (coverColumnByImage.has(img.image_id)) {
      img.reference_type = 'cover'
      img.reference_id = coverColumnByImage.get(img.image_id)
      img.reference_title = null
    } else if (diaryByImage.has(img.image_id)) {
      img.reference_type = 'cover'
      img.reference_id = diaryByImage.get(img.image_id)
      img.reference_title = null
    } else {
      img.reference_type = null
      img.reference_id = null
      img.reference_title = null
    }
  }
}

module.exports = {
  REFERENCE_SOURCES,
  ORPHAN_RECONCILE_SQL,
  findReferencedImageIds,
  attachReferences
}
