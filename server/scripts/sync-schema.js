require('module-alias/register');
require('dotenv').config();
const sequelize = require('@config/database');

// 一次性幂等结构同步：补齐 sync() 不做的 ALTER（新增列 + ENUM 追加）
// 设计约束：
// - 不依赖 SequelizeMeta 版本表，重复执行安全
// - ENUM 追加必须末尾（MySQL 按索引存储，插中间会错位），全量重写
// - 仅处理当前已知的漂移字段，后续新增在此追加分支即可

async function hasColumn(table, column) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column LIMIT 1`,
    { replacements: { table, column } }
  );
  return rows.length > 0;
}

async function getEnumType(table, column) {
  const [rows] = await sequelize.query(`SHOW COLUMNS FROM \`${table}\` LIKE :column`, {
    replacements: { column }
  });
  if (!rows.length) return null;
  return rows[0].Type; // e.g. "enum('published','trash')"
}

async function syncSchema() {
  // post.post_cover
  if (!(await hasColumn('post', 'post_cover'))) {
    await sequelize.query(
      `ALTER TABLE \`post\` ADD COLUMN \`post_cover\` VARCHAR(512) NULL COMMENT '封面图URL' AFTER \`post_category_id\``
    );
    console.log('[sync-schema] post.post_cover 已添加');
  }

  // post.post_status -> ENUM('published','trash','draft')
  {
    const type = await getEnumType('post', 'post_status');
    if (type && !type.includes("'draft'")) {
      await sequelize.query(
        `ALTER TABLE \`post\` MODIFY COLUMN \`post_status\` ENUM('published','trash','draft') NOT NULL DEFAULT 'published' COMMENT '文章状态'`
      );
      console.log('[sync-schema] post.post_status 已追加 draft');
    }
  }

  // friend_link.preview_image
  if (!(await hasColumn('friend_link', 'preview_image'))) {
    await sequelize.query(
      `ALTER TABLE \`friend_link\` ADD COLUMN \`preview_image\` VARCHAR(512) NULL COMMENT '预览图URL' AFTER \`description\``
    );
    console.log('[sync-schema] friend_link.preview_image 已添加');
  }

  // friend_link.status -> ENUM('show','hide','draft')
  {
    const type = await getEnumType('friend_link', 'status');
    if (type && !type.includes("'draft'")) {
      await sequelize.query(
        `ALTER TABLE \`friend_link\` MODIFY COLUMN \`status\` ENUM('show','hide','draft') NOT NULL DEFAULT 'show' COMMENT '显示状态'`
      );
      console.log('[sync-schema] friend_link.status 已追加 draft');
    }
  }

  // blog_column.status -> ENUM('show','hide','draft')  (表名见 Column.js:35)
  {
    // 兼容表名大小写：优先 blog_column，其次 column
    const table = (await hasColumn('blog_column', 'status')) || (await hasColumn('blog_column', 'column_id'))
      ? 'blog_column'
      : 'column';
    // 若表不存在则由 sync() 负责创建，跳过
    try {
      const type = await getEnumType(table, 'status');
      if (type && !type.includes("'draft'")) {
        await sequelize.query(
          `ALTER TABLE \`${table}\` MODIFY COLUMN \`status\` ENUM('show','hide','draft') NOT NULL DEFAULT 'show' COMMENT '显示状态'`
        );
        console.log(`[sync-schema] ${table}.status 已追加 draft`);
      }
    } catch (e) {
      if (!e.message.includes("doesn't exist") && !e.message.includes('Unknown table')) throw e;
    }
  }

  console.log('[sync-schema] 结构同步完成');
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      await syncSchema();
      await sequelize.close();
    } catch (e) {
      console.error('[sync-schema] 失败:', e.message);
      process.exit(1);
    }
  })();
}

module.exports = syncSchema;
