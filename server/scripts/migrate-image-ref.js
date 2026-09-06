require('module-alias/register');
require('dotenv').config();
const { QueryTypes } = require('sequelize');
const sequelize = require('@config/database');
const { Image, Post, Column, FriendLink, PostImage } = require('@models');
const { extractReferencedImages, storageKeyFromUrl } = require('@utils/image');
const { ORPHAN_RECONCILE_SQL } = require('@utils/gc');

// 一次性幂等数据迁移：图片引用从 image.reference_type/reference_id 迁至业务表外键/关联表
// 设计约束：
// - URL 匹配是唯一可信依据：业务表存的 /uploads/ URL 与 image.storage_path 一致才建立引用
//   （绝不按旧 reference_id 盲迁——旧 cover 类型在文章/专栏/日记间共用整数空间，正是本次事故根源）
// - URL → key 统一走 utils/image.js 的 storageKeyFromUrl（兼容本站绝对域名 / markdown title /
//   HTML 实体 / query 后缀），与线上保存逻辑单一来源；重跑只会多建指针不会少建
// - 旧 reference_type/reference_id 列不清洗，作为回滚保障保留
// - 重复执行安全（按当前业务数据重建关联，结果收敛）
// - 迁移同时输出审计：存量数据中未命中 image 表的本站 /uploads/ 引用清单
//   （历史漏派或已被 GC 回收，UI 上已是死链），部署一次即可看清存量健康状况
// - diary 收敛为单图契约：images 最多保留 1 张（与 DTO 拒绝多图配套）

async function migratePostCovers(posts, idByKey, misses) {
  let updated = 0;
  for (const post of posts) {
    const key = storageKeyFromUrl(post.post_cover);
    if (key && !idByKey.has(key)) {
      misses.push(`post#${post.post_id} 封面: ${post.post_cover}`);
    }
    const imageId = key ? idByKey.get(key) : null;
    if (imageId && post.cover_image_id !== imageId) {
      await post.update({ cover_image_id: imageId });
      updated++;
    }
  }
  return updated;
}

async function migratePostImages(posts, idByKey, misses) {
  let created = 0;
  for (const post of posts) {
    const keys = [...extractReferencedImages(post.post_content)];
    for (const key of keys) {
      if (!idByKey.has(key)) misses.push(`post#${post.post_id} 正文: ${key}`);
    }
    const imageIds = [...new Set(keys.map(key => idByKey.get(key)).filter(Boolean))];

    await PostImage.destroy({ where: { post_id: post.post_id } });
    if (imageIds.length > 0) {
      await PostImage.bulkCreate(imageIds.map(imageId => ({ post_id: post.post_id, image_id: imageId })));
      created += imageIds.length;
    }
  }
  return created;
}

async function migrateColumnCovers(idByKey, misses) {
  const columns = await Column.findAll({ attributes: ['column_id', 'column_cover', 'cover_image_id'] });
  let updated = 0;
  for (const column of columns) {
    const key = storageKeyFromUrl(column.column_cover);
    if (key && !idByKey.has(key)) {
      misses.push(`column#${column.column_id} 封面: ${column.column_cover}`);
    }
    const imageId = key ? idByKey.get(key) : null;
    if (imageId && column.cover_image_id !== imageId) {
      await column.update({ cover_image_id: imageId });
      updated++;
    }
  }
  return updated;
}

async function migrateFriendLinkPreviews(idByKey, misses) {
  const links = await FriendLink.findAll({ attributes: ['friend_link_id', 'preview_image', 'preview_image_id'] });
  let updated = 0;
  for (const link of links) {
    // 友链 preview_image 存裸 key（无 /uploads/ 前缀），外链为 http(s) 全 URL，均直查
    if (!link.preview_image || /^https?:\/\//i.test(link.preview_image)) continue;
    if (!idByKey.has(link.preview_image)) {
      misses.push(`friend_link#${link.friend_link_id} 预览图: ${link.preview_image}`);
    }
    const imageId = idByKey.get(link.preview_image) || null;
    if (imageId && link.preview_image_id !== imageId) {
      await link.update({ preview_image_id: imageId });
      updated++;
    }
  }
  return updated;
}

async function migrateDiaryCovers(idByKey, misses) {
  const rows = await sequelize.query(`SELECT diary_id, images, cover_image_id FROM diary`, { type: QueryTypes.SELECT });

  let updated = 0;
  let trimmed = 0;
  for (const row of rows) {
    let urls = [];
    try {
      urls = typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || []);
    } catch (err) {
      urls = [];
    }
    if (!Array.isArray(urls)) urls = [];

    // 死链清除 + 单图契约：仅保留 image 表中仍存在的 URL，且最多保留 1 张
    const liveUrls = urls.filter(url => {
      const key = storageKeyFromUrl(url);
      if (!key) return false;
      if (!idByKey.has(key)) {
        misses.push(`diary#${row.diary_id} 图片: ${url}`);
        return false;
      }
      return true;
    });
    const keptUrls = liveUrls.slice(0, 1);
    if (keptUrls.length < urls.length) trimmed++;

    const coverKey = storageKeyFromUrl(keptUrls[0]);
    const coverId = coverKey ? idByKey.get(coverKey) : null;

    if (Number(row.cover_image_id || 0) === Number(coverId || 0) && JSON.stringify(keptUrls) === JSON.stringify(urls)) {
      continue;
    }

    await sequelize.query(
      `UPDATE diary SET cover_image_id = :cover, images = :images WHERE diary_id = :id`,
      { replacements: { cover: coverId, images: JSON.stringify(keptUrls), id: row.diary_id } }
    );
    updated++;
  }
  return { updated, trimmed };
}

async function reportOrphans() {
  const rows = await sequelize.query(ORPHAN_RECONCILE_SQL, { type: QueryTypes.SELECT });
  return rows.filter(row => !row.referenced).map(row => Number(row.imageId));
}

async function migrate() {
  const images = await Image.findAll({ attributes: ['image_id', 'storage_path'] });
  const idByKey = new Map(images.map(img => [img.storage_path, img.image_id]));
  console.log(`[migrate] image 表共 ${images.length} 条记录`);
  const misses = [];

  const posts = await Post.findAll({ attributes: ['post_id', 'post_cover', 'post_content', 'cover_image_id'] });

  const coverCount = await migratePostCovers(posts, idByKey, misses);
  console.log(`[migrate] 文章封面引用迁移：${coverCount} 篇`);

  const postImageCount = await migratePostImages(posts, idByKey, misses);
  console.log(`[migrate] 文章正文图片关联重建：${postImageCount} 条`);

  const columnCount = await migrateColumnCovers(idByKey, misses);
  console.log(`[migrate] 专栏封面引用迁移：${columnCount} 个`);

  const linkCount = await migrateFriendLinkPreviews(idByKey, misses);
  console.log(`[migrate] 友链预览图引用迁移：${linkCount} 条`);

  const { updated: diaryCount, trimmed: diaryTrimmed } = await migrateDiaryCovers(idByKey, misses);
  console.log(`[migrate] 日记封面引用迁移：${diaryCount} 条（死链清除/截断多图 ${diaryTrimmed} 条）`);

  if (misses.length > 0) {
    console.log(`[migrate] 审计：${misses.length} 处本站图片引用未命中 image 表（UI 已是死链或将被 GC 回收）：`);
    for (const item of misses.slice(0, 50)) console.log(`  - ${item}`);
    if (misses.length > 50) console.log(`  ...其余 ${misses.length - 50} 条略`);
  } else {
    console.log('[migrate] 审计：本站图片引用全部命中 image 表');
  }

  const orphans = await reportOrphans();
  console.log(`[migrate] 当前无引用孤儿图片 ${orphans.length} 张（由 GC 宽限后回收）：${orphans.join(', ') || '无'}`);

  console.log('[migrate] 数据迁移完成');
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      await migrate();
      await sequelize.close();
    } catch (e) {
      console.error('[migrate] 失败:', e.message);
      process.exit(1);
    }
  })();
}

module.exports = migrate;
