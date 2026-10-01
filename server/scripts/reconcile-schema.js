// 结构对账：把「模型已声明关联」的外键补齐到**已存在**的表上。
//
// 为什么需要它：sequelize.sync() 只在「建表那一刻」内联外键——关联声明是在表建好之后才加的
// （如 Post.belongsTo(Image)），重启不会产生任何 ALTER。于是同一份代码，老库 / 新库 / 开发机 /
// 生产的外键集合各不相同（本机 2026-10 实测只有 4 个外键，全新库有 8 个）。删除语义
// （CASCADE / SET NULL / NO ACTION）因此随环境而变，目前只靠「应用层都显式删关联行」兜着。
//
// 用法（默认只报告，不改结构）：
//   node scripts/reconcile-schema.js            # dry-run：列出「已存在 / 待补 / 被脏数据挡住 / 跳过」
//   node scripts/reconcile-schema.js --apply    # 执行补齐（逐项先做孤儿引用校验，脏数据项跳过）
//
// 安全设计：
//   - 幂等：存在性判定用 (表, 列, 被引用表) 三元组而不是约束名，重复执行第二次报告 0 变更
//   - 先校验后 ALTER：某一列存在指向不存在行的脏数据时，跳过该项并列出样本，绝不硬上
//   - 表 / 列不存在（新环境还没建、老环境缺列）时跳过并指路（sync 建表 / sync-schema 补列）
//   - 约束名由本脚本显式给出（fk_<表>_<列>），回滚 SQL 一并打印
//
// 基准出处（2026-10-01 在全新库上 sync() 建表后实测，见 deploy/schema.md）：下面的 FK_TARGETS
// 就是「新库会长成什么样」，老库按它对齐。刻意**不补 blog_column.cover_image_id**——模型没有
// Column.belongsTo(Image) 这条关联声明，新库也没有这个外键，保持两边一致。
require('../bootstrap');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('@config/database');

const FK_TARGETS = [
  { table: 'column_post', column: 'column_id', refTable: 'blog_column', refColumn: 'column_id', onDelete: 'CASCADE' },
  { table: 'column_post', column: 'post_id', refTable: 'post', refColumn: 'post_id', onDelete: 'CASCADE' },
  { table: 'post', column: 'post_category_id', refTable: 'Tag', refColumn: 'tag_id', onDelete: 'SET NULL' },
  { table: 'diary', column: 'cover_image_id', refTable: 'image', refColumn: 'image_id', onDelete: 'SET NULL' },
  { table: 'post', column: 'cover_image_id', refTable: 'image', refColumn: 'image_id', onDelete: 'SET NULL' },
  { table: 'visit_log', column: 'post_id', refTable: 'post', refColumn: 'post_id', onDelete: 'SET NULL' },
  { table: 'post_image', column: 'post_id', refTable: 'post', refColumn: 'post_id', onDelete: 'CASCADE' },
  { table: 'post_image', column: 'image_id', refTable: 'image', refColumn: 'image_id', onDelete: 'NO ACTION' },
];

async function tableExists(sequelize, table) {
  const rows = await sequelize.query(
    `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table LIMIT 1`,
    { type: QueryTypes.SELECT, replacements: { table } }
  );
  return rows.length > 0;
}

async function columnExists(sequelize, table, column) {
  const rows = await sequelize.query(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column LIMIT 1`,
    { type: QueryTypes.SELECT, replacements: { table, column } }
  );
  return rows.length > 0;
}

// 外键是否已存在：按 (表, 列, 被引用表) 判定，不看名字（不同创建路径生成的约束名不同）
async function foreignKeyExists(sequelize, target) {
  const rows = await sequelize.query(
    `SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column
        AND REFERENCED_TABLE_NAME = :refTable LIMIT 1`,
    { type: QueryTypes.SELECT, replacements: { table: target.table, column: target.column, refTable: target.refTable } }
  );
  return rows.length > 0;
}

async function constraintNameTaken(sequelize, table, name) {
  const rows = await sequelize.query(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND CONSTRAINT_NAME = :name LIMIT 1`,
    { type: QueryTypes.SELECT, replacements: { table, name } }
  );
  return rows.length > 0;
}

// 孤儿引用校验：列上非空但引用不存在的行（会挡住 ALTER，必须先人工处理）
async function findOrphans(sequelize, { table, column, refTable, refColumn }) {
  const where = `t.\`${column}\` IS NOT NULL AND r.\`${refColumn}\` IS NULL`;
  const countRows = await sequelize.query(
    `SELECT COUNT(*) AS n FROM \`${table}\` t LEFT JOIN \`${refTable}\` r ON t.\`${column}\` = r.\`${refColumn}\` WHERE ${where}`,
    { type: QueryTypes.SELECT }
  );
  const count = Number(countRows[0]?.n || 0);
  if (count === 0) return { count: 0, samples: [] };
  const samples = await sequelize.query(
    `SELECT t.\`${column}\` AS v FROM \`${table}\` t LEFT JOIN \`${refTable}\` r ON t.\`${column}\` = r.\`${refColumn}\` WHERE ${where} LIMIT 5`,
    { type: QueryTypes.SELECT }
  );
  return { count, samples: samples.map((s) => s.v) };
}

async function reconcileSchema({ apply = false } = {}) {
  const report = [];

  for (const target of FK_TARGETS) {
    const label = `${target.table}.${target.column} → ${target.refTable}.${target.refColumn}`;

    if (!(await tableExists(sequelize, target.table))) {
      report.push({ label, status: 'skip-table', detail: `表 ${target.table} 不存在（新环境由 sync() 建表，老环境先跑 sync-schema.js）` });
      continue;
    }
    if (!(await columnExists(sequelize, target.table, target.column))) {
      report.push({ label, status: 'skip-column', detail: `列 ${target.column} 不存在（先跑 sync-schema.js 补列）` });
      continue;
    }
    if (await foreignKeyExists(sequelize, target)) {
      report.push({ label, status: 'exists', detail: '外键已在' });
      continue;
    }

    const orphans = await findOrphans(sequelize, target);
    if (orphans.count > 0) {
      report.push({
        label,
        status: 'blocked',
        detail: `${orphans.count} 行孤儿引用（样本：${orphans.samples.join(', ')}）——先人工确认这些行，本项已跳过`,
      });
      continue;
    }

    let name = `fk_${target.table}_${target.column}`;
    if (await constraintNameTaken(sequelize, target.table, name)) name = `${name}_2`;

    const sql =
      `ALTER TABLE \`${target.table}\` ADD CONSTRAINT \`${name}\` FOREIGN KEY (\`${target.column}\`) ` +
      `REFERENCES \`${target.refTable}\` (\`${target.refColumn}\`) ON DELETE ${target.onDelete} ON UPDATE CASCADE;`;

    if (!apply) {
      report.push({ label, status: 'planned', detail: `ON DELETE ${target.onDelete}（约束名 ${name}）`, sql });
      continue;
    }

    try {
      await sequelize.query(sql);
      report.push({
        label,
        status: 'applied',
        detail: `ON DELETE ${target.onDelete}（约束名 ${name}；回滚：ALTER TABLE \`${target.table}\` DROP FOREIGN KEY \`${name}\`;）`,
        sql,
      });
    } catch (err) {
      report.push({ label, status: 'failed', detail: `ALTER 失败：${err.message}` });
    }
  }

  return report;
}

async function main() {
  const apply = process.argv.includes('--apply');
  await sequelize.authenticate();

  const report = await reconcileSchema({ apply });

  const mark = {
    exists: '已在  ', planned: '待补  ', applied: '已补  ', blocked: '挡住  ', failed: '失败  ',
    'skip-table': '跳过  ', 'skip-column': '跳过  ',
  };
  console.log(`[reconcile] ${apply ? '执行' : 'dry-run'}：结构对账（外键补齐）\n`);
  for (const row of report) {
    console.log(`  ${mark[row.status] || row.status} ${row.label}`);
    console.log(`         ${row.detail}`);
  }
  const planned = report.filter((r) => r.status === 'planned').length;
  const applied = report.filter((r) => r.status === 'applied').length;
  const blocked = report.filter((r) => r.status === 'blocked').length;
  console.log(`\n[reconcile] 合计：已存在 ${report.filter((r) => r.status === 'exists').length}，` +
    `${apply ? `本次已补 ${applied}` : `待补 ${planned}`}，挡住 ${blocked}，跳过 ${report.filter((r) => r.status.startsWith('skip')).length}`);
  if (!apply && planned > 0) {
    console.log('[reconcile] 以上为 dry-run（未执行）。确认后跑：node scripts/reconcile-schema.js --apply');
    console.log('[reconcile] 执行前建议先备份：node scripts/backup.js');
  }

  await sequelize.close();
  if (report.some((r) => r.status === 'failed')) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[reconcile] 失败:', err.message);
    process.exit(1);
  });
}

module.exports = { reconcileSchema, FK_TARGETS };
