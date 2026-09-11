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

  // post.view_count
  if (!(await hasColumn('post', 'view_count'))) {
    await sequelize.query(
      `ALTER TABLE \`post\` ADD COLUMN \`view_count\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '浏览量(PV)'`
    );
    console.log('[sync-schema] post.view_count 已添加');
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

  // visit_log 表
  {
    const [tables] = await sequelize.query(
      `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'visit_log' LIMIT 1`
    );
    if (tables.length === 0) {
      await sequelize.query(`
        CREATE TABLE \`visit_log\` (
          \`visit_id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`post_id\` BIGINT UNSIGNED NULL,
          \`ip_address\` VARCHAR(45) NOT NULL COMMENT '访客IP',
          \`user_agent\` VARCHAR(512) NULL COMMENT '浏览器UA',
          \`referrer\` VARCHAR(512) NULL COMMENT '来源页',
          \`page_path\` VARCHAR(256) NOT NULL COMMENT '访问路径',
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (\`post_id\`) REFERENCES \`post\`(\`post_id\`) ON DELETE SET NULL,
          INDEX \`idx_post_id\` (\`post_id\`),
          INDEX \`idx_created_at\` (\`created_at\`),
          INDEX \`idx_ip\` (\`ip_address\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('[sync-schema] visit_log 表已创建');
    }
  }

  // daily_stat 表（每日访问统计，由 utils/dailyStat.js 全量重算 UPSERT；独立于 90 天访问日志）
  {
    const [tables] = await sequelize.query(
      `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_stat' LIMIT 1`
    );
    if (tables.length === 0) {
      await sequelize.query(`
        CREATE TABLE \`daily_stat\` (
          \`stat_date\` DATE NOT NULL COMMENT '统计日期（北京时间）',
          \`pv\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '当日浏览量PV',
          \`uv\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '当日独立访客UV（按IP当日去重）',
          \`created_at\` DATETIME NOT NULL,
          \`updated_at\` DATETIME NOT NULL,
          PRIMARY KEY (\`stat_date\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('[sync-schema] daily_stat 表已创建');
    }
  }

  // diary 表（与 models/Diary.js 保持一致；sync() 兜底，表存在则跳过）
  {
    const [tables] = await sequelize.query(
      `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'diary' LIMIT 1`
    );
    if (tables.length === 0) {
      await sequelize.query(`
        CREATE TABLE \`diary\` (
          \`diary_id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`content\` TEXT NOT NULL COMMENT '日记内容（最多3000字）',
          \`images\` JSON NULL COMMENT '图片URL数组（单图：images[0] 即封面）',
          \`cover_image_id\` BIGINT UNSIGNED NULL COMMENT '封面图片ID（由 images[0] 派生）',
          \`created_at\` DATETIME NOT NULL,
          \`updated_at\` DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('[sync-schema] diary 表已创建');
    }
  }

  // ========== 图片引用重构（业务表持 image_id，image 表纯元数据） ==========

  // image.orphan_since：GC 对账孤儿标记
  if (!(await hasColumn('image', 'orphan_since'))) {
    await sequelize.query(
      `ALTER TABLE \`image\` ADD COLUMN \`orphan_since\` DATETIME NULL COMMENT '孤儿标记时间：GC 对账无引用时打标，超宽限期物理删除'`
    );
    console.log('[sync-schema] image.orphan_since 已添加');
  }

  // post.cover_image_id
  if (!(await hasColumn('post', 'cover_image_id'))) {
    await sequelize.query(
      `ALTER TABLE \`post\` ADD COLUMN \`cover_image_id\` BIGINT UNSIGNED NULL COMMENT '封面图片ID（由 post_cover 派生）' AFTER \`post_cover\``
    );
    console.log('[sync-schema] post.cover_image_id 已添加');
  }

  // blog_column.cover_image_id（表名大小写兼容同上）
  {
    const table = (await hasColumn('blog_column', 'column_id')) ? 'blog_column' : 'column';
    try {
      if (!(await hasColumn(table, 'cover_image_id'))) {
        await sequelize.query(
          `ALTER TABLE \`${table}\` ADD COLUMN \`cover_image_id\` BIGINT UNSIGNED NULL COMMENT '封面图片ID（由 column_cover 派生）' AFTER \`column_cover\``
        );
        console.log(`[sync-schema] ${table}.cover_image_id 已添加`);
      }
    } catch (e) {
      if (!e.message.includes("doesn't exist") && !e.message.includes('Unknown table')) throw e;
    }
  }

  // friend_link.preview_image_id
  if (!(await hasColumn('friend_link', 'preview_image_id'))) {
    await sequelize.query(
      `ALTER TABLE \`friend_link\` ADD COLUMN \`preview_image_id\` BIGINT UNSIGNED NULL COMMENT '预览图图片ID（本地抓图时写入）' AFTER \`preview_image\``
    );
    console.log('[sync-schema] friend_link.preview_image_id 已添加');
  }

  // diary.cover_image_id（单列引用，与 post/column 对称）
  if (!(await hasColumn('diary', 'cover_image_id'))) {
    await sequelize.query(
      `ALTER TABLE \`diary\` ADD COLUMN \`cover_image_id\` BIGINT UNSIGNED NULL COMMENT '封面图片ID（由 images[0] 派生）' AFTER \`images\``
    );
    console.log('[sync-schema] diary.cover_image_id 已添加');
  }

  // post_image 关联表（文章正文图片，保存文章时全量同步）
  {
    const [tables] = await sequelize.query(
      `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'post_image' LIMIT 1`
    );
    if (tables.length === 0) {
      await sequelize.query(`
        CREATE TABLE \`post_image\` (
          \`post_image_id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`post_id\` BIGINT UNSIGNED NOT NULL COMMENT '文章ID',
          \`image_id\` BIGINT UNSIGNED NOT NULL COMMENT '正文图片ID',
          \`created_at\` DATETIME NOT NULL,
          \`updated_at\` DATETIME NOT NULL,
          UNIQUE KEY \`post_image_unique\` (\`post_id\`, \`image_id\`),
          INDEX \`idx_image_id\` (\`image_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('[sync-schema] post_image 表已创建');
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
