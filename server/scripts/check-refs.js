// 引用图一致性护栏：node scripts/check-refs.js
//
// 为什么需要它：同一张「image 被谁引用」的图有三份描述，而三份的**变更触发点不同**——
//   ① services/image/refs.js 的 REFERENCE_SOURCES：引用语义的唯一权威（GC 对账 / 后台筛图 / 反查都从它派生）
//   ② models/index.js 的关联：只服务查询取数（列表小卡封面的那张 include）
//   ③ scripts/reconcile-schema.js 的 FK_TARGETS：外键补齐基准，一次性快照
// 改一份忘另一份不会报错，只会静默漂移：账本加了而关联没加 → 查询取不到（不报错，只是缺）；
// FK_TARGETS 少了 → 各环境外键继续分叉（2026-10 反复出现的那类问题）。
// 本脚本把这三种一致性变成机械断言——**加持图业务 / 加关联后跑一下就知道对齐没有**。
//
// 四条断言（两两双向对齐；有意缺席必须登记在 EXCEPTIONS 里并写明理由）：
//   ① 账本每条 → 该模型有一条指向 image 的 belongsTo 关联，且外键列与账本一致
//   ② 模型每条指向 image 的 belongsTo → 账本里有对应条目
//   ③ FK_TARGETS 每条 → 模型里有对应 belongsTo 关联
//   ④ 模型每条 belongsTo（外键列在本表）→ FK_TARGETS 里有对应条目
// 只认 belongsTo：hasMany / hasOne 的外键列在**对方**表上，不产生本表外键，故不参与 ③④。
// 刻意不比对 onDelete 语义：那是 FK_TARGETS 显式给出的（同一列挂 hasMany 与 belongsTo 时
// Sequelize 的默认值不同，靠它推断不可靠），本脚本只管「这条外键/关联/账本条目存不存在」。
//
// 特性：零依赖、不连库（require 模型只注册定义，Sequelize 构造时不连接）、不占端口；退出码非 0 = 有违规。
// 预设的占位 env 必须在 require 业务模块之前设置：config/env.js 在 require 期求值并校验必填项
process.env.DB_NAME = process.env.DB_NAME || 'check-refs';
process.env.DB_USER = process.env.DB_USER || 'check-refs';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'check-refs';

require('module-alias/register');

const { REFERENCE_SOURCES } = require('@services/image/refs');
const models = require('@models');
const { FK_TARGETS } = require('./reconcile-schema');

const IMAGE_TABLE = 'image';

// 显式例外：某一份描述里「有意缺席」的条目。加例外必须写明理由——它是"三方对齐"这条规则的
// 唯一合法出口，也是把刻意的分歧与漏改区分开的地方
const EXCEPTIONS = [
  {
    kind: 'ledger-without-model',
    table: 'blog_column',
    column: 'cover_image_id',
    reason: '模型刻意没有 Column.belongsTo(Image)：新库与老库都不生成该外键（见 reconcile-schema.js 的 FK_TARGETS 注释与 deploy/schema.md）'
  }
];

function isExcepted(kind, { table, column }) {
  return EXCEPTIONS.some((e) => e.kind === kind && e.table === table && e.column === column);
}

// 参与对账的模型（sequelize 实例没有 tableName / associations，自然被滤掉）
const ALL_MODELS = Object.values(models).filter((m) => m && m.tableName && m.associations);

// 全部 belongsTo 关联（外键列在源表上）
function belongsToAssociations() {
  const out = [];
  for (const model of ALL_MODELS) {
    for (const assoc of Object.values(model.associations)) {
      if (assoc.associationType !== 'BelongsTo') continue;
      out.push({
        table: model.tableName,
        column: assoc.foreignKey,
        refTable: assoc.target.tableName,
        refColumn: assoc.target.primaryKeyAttribute,
        as: assoc.as
      });
    }
  }
  return out;
}

function main() {
  const violations = [];
  const assocs = belongsToAssociations();
  const entry = (table, column) => `${table}.${column}`;

  // ① 账本 → 模型关联（模型关联只服务查询；缺了查询取不到，但账本仍会正确判定引用）
  for (const source of REFERENCE_SOURCES) {
    if (isExcepted('ledger-without-model', { table: source.table, column: source.imageColumn })) continue;
    const hit = assocs.find(
      (a) => a.table === source.table && a.column === source.imageColumn && a.refTable === IMAGE_TABLE
    );
    if (!hit) {
      violations.push(
        `① 账本条目 ${entry(source.table, source.imageColumn)} 在 models/index.js 找不到指向 image 的关联 —— 补一条 belongsTo（查询取缩略图要用），或在本脚本的 EXCEPTIONS 登记理由`
      );
    }
  }

  // ② 模型关联 → 账本（防「加了关联却忘了记账」：账本才是回收判定的依据）
  for (const assoc of assocs) {
    if (assoc.refTable !== IMAGE_TABLE) continue;
    if (isExcepted('model-without-ledger', assoc)) continue;
    const hit = REFERENCE_SOURCES.find(
      (s) => s.table === assoc.table && s.imageColumn === assoc.column
    );
    if (!hit) {
      violations.push(
        `② 模型关联 ${entry(assoc.table, assoc.column)} → image 不在 services/image/refs.js 的 REFERENCE_SOURCES 里 —— 加一条账本条目（GC 对账与筛图都从它派生），或在本脚本的 EXCEPTIONS 登记理由`
      );
    }
  }

  // ③ FK_TARGETS → 模型关联
  for (const fk of FK_TARGETS) {
    if (isExcepted('fk-without-model', { table: fk.table, column: fk.column })) continue;
    const hit = assocs.find(
      (a) => a.table === fk.table && a.column === fk.column && a.refTable === fk.refTable && a.refColumn === fk.refColumn
    );
    if (!hit) {
      violations.push(
        `③ 外键基准 ${entry(fk.table, fk.column)} → ${entry(fk.refTable, fk.refColumn)} 在模型里找不到对应关联 —— 先补关联，或在 reconcile-schema.js 的 FK_TARGETS 删掉该行 / 在本脚本的 EXCEPTIONS 登记理由`
      );
    }
  }

  // ④ 模型关联 → FK_TARGETS（新库由 sync() 内联生成，老库全靠这份基准补齐）
  for (const assoc of assocs) {
    if (isExcepted('model-without-fk', assoc)) continue;
    const hit = FK_TARGETS.find(
      (fk) => fk.table === assoc.table && fk.column === assoc.column && fk.refTable === assoc.refTable && fk.refColumn === assoc.refColumn
    );
    if (!hit) {
      violations.push(
        `④ 模型关联 ${entry(assoc.table, assoc.column)} → ${entry(assoc.refTable, assoc.refColumn)} 不在 reconcile-schema.js 的 FK_TARGETS 里 —— 老库不会生成这个外键，请加一行，或在 reconcile-schema.js 标注为不补 / 在本脚本的 EXCEPTIONS 登记理由`
      );
    }
  }

  if (violations.length) {
    console.error(`引用图护栏：${violations.length} 条不一致`);
    for (const v of violations) console.error('  ✗ ' + v);
    process.exit(1);
  }

  console.log(
    `引用图护栏通过：账本 ${REFERENCE_SOURCES.length} 条 / 模型关联 ${assocs.length} 条 / 外键基准 ${FK_TARGETS.length} 条，四向一致（登记例外 ${EXCEPTIONS.length} 条）`
  );
}

main();
