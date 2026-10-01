# 数据库结构基线与对账

本文是「库结构到底由谁说了算」的落地说明与实测基线，配合 `server/scripts/sync-schema.js`（补列 / ENUM）与
`server/scripts/reconcile-schema.js`（补外键，2026-10 新增）使用。改结构前先读本文。

## 结构出处规则（三条，必须一起读）

1. **列 / 索引 / 外键都声明在模型里**（`server/models/*.js` 的 `indexes`、`server/models/index.js` 的关联）。
   `sequelize.sync()` 启动时：表不存在就建表（**建表那一刻内联外键**）、对已存在的表**补齐模型声明但库里缺失的索引**。
2. `sync()` **不补列、不追加 ENUM 值** —— 这两类漂移归 `server/scripts/sync-schema.js`（幂等，可重复执行）。
3. **`sync()` 不给已存在的表补外键**：关联声明是在表建好之后才加的（如 `Post.belongsTo(Image)`），
   重启不会产生任何 ALTER。因此 **「模型里声明了关联」≠「库里一定有外键」**——同一份代码，
   老库 / 新库 / 开发机 / 生产的外键集合可能不同。2026-10 起新增 `reconcile-schema.js`
   专门把这类差异补齐（默认 dry-run）。

推论（选择结构方案时的默认取向）：**以「模型在当前代码下建表会建成什么样」为唯一基准**，
老库按它对齐，而不是反过来让模型迁就库里的历史形态。

## 2026-10-01 实测基线（只读 information_schema）

「全新库」= 空库上跑 `sequelize.sync()` 建出的结构，即**代码当前声明的基准**；
老库（本机开发库 / 生产）按它对齐。三者的差异就是「结构随建表时刻漂移」的证据。

| 项 | 全新库（基准） | 本机开发库 | 生产 |
|---|---|---|---|
| 表清单 | 12 张（`Tag` `admin` `blog_column` `column_post` `daily_stat` `diary` `friend_link` `image` `post` `post_image` `setting` `visit_log`） | 15 张 = 12 + `post_comment`(3 行) + `notice`(0) + `status`(0) | 13 张 = 12 + `moment`(0 行，无任何代码引用) |
| 外键 | **8 个**（见下） | 4 个：`column_post`×2（CASCADE）、`post.post_category_id`（SET NULL）、`post_comment.post_id`（CASCADE，遗留表自带） | 4 个：`column_post`×2（CASCADE）、`post.post_category_id`（SET NULL）、`visit_log.post_id`（SET NULL） |
| 相对基准缺哪些外键 | — | 5 个：`post.cover_image_id`、`diary.cover_image_id`、`post_image.post_id`、`post_image.image_id`、`visit_log.post_id` | 4 个：`post.cover_image_id`、`diary.cover_image_id`、`post_image.post_id`、`post_image.image_id` |
| 待补项的脏数据（孤儿引用） | — | `visit_log.post_id` 有 **3 行**孤儿（指向已不存在的文章）→ 该项会被脚本挡住 | 4 项**全部 0 孤儿**（2026-10-01 校验）→ 可安全补齐 |
| 重复索引 | 无 | `post_image` 两对（下详） | `post_image` 两对（同左） |

全新库的 8 个外键（`reconcile-schema.js` 的 `FK_TARGETS` 逐字对应）：

| 外键 | ON DELETE / ON UPDATE |
|---|---|
| `column_post.column_id → blog_column.column_id` | CASCADE / CASCADE |
| `column_post.post_id → post.post_id` | CASCADE / CASCADE |
| `post.post_category_id → Tag.tag_id` | SET NULL / CASCADE |
| `post.cover_image_id → image.image_id` | SET NULL / CASCADE |
| `diary.cover_image_id → image.image_id` | SET NULL / CASCADE |
| `visit_log.post_id → post.post_id` | SET NULL / CASCADE |
| `post_image.post_id → post.post_id` | CASCADE / CASCADE |
| `post_image.image_id → image.image_id` | **NO ACTION** / CASCADE（列 NOT NULL，不能 SET NULL） |

重复索引（两个环境都有、都不影响正确性，只占空间）：`post_image` 上 `post_image_unique` 与
`post_image_post_id_image_id` 同列 `(post_id, image_id)`、`idx_image_id` 与 `post_image_image_id`
同列 `image_id`——早期 `sync-schema` 建表 + `sync()` 只补不删共同造成。

### 遗留对象（无模型、无迁移、**各环境不是同一批**）

| 环境 | 对象 | 行数 | 说明 |
|---|---|---|---|
| 本机开发库 | `post_comment` | 3 | giscus 之前自托管评论时代的表（列含 github_id / github_login …），代码零引用 |
| 本机开发库 | `notice` | 0 | 早期「公告」雏形，从未接线 |
| 本机开发库 | `status` | 0 | 列形态像早期「说说 / 日记」原型，已被 `diary` 取代 |
| 生产 | `moment` | 0 | 列 `moment_content / moment_image / moment_status`，同样是早期「动态」原型；代码零引用 |

**注意**：本机有 `post_comment` / `notice` / `status` 而生产没有；生产有 `moment` 而本机没有
——两边的历史路径不同，「遗留表」不是同一批，清理必须**逐环境**决策，不要照着一份清单删。

**决策（2026-10 第二轮，用户已确认）**：遗留表与重复索引**本轮不动**，只登记。
`reconcile-schema.js` 明确不碰它们（删除 `post_comment` 意味着丢掉那 3 行旧评论，需单独决策与单独脚本）。

### 一处有意保留的非对称

`blog_column.cover_image_id` 没有关联声明（`Column` 未 `belongsTo(Image)`，只有 `Post` / `Diary` 有），
所以**新库也没有它的外键**，`reconcile-schema.js` 同样不补它——保持「新库什么样、老库就什么样」的口径一致。
若将来专栏封面也要用缩略图，加关联声明时要意识到：这只对新库生效，老库靠 reconcile 脚本补。

## 无消费者的导出（登记，不清理）

以下符号导出但仓库内无消费者（注释里说是留给验证脚本的，目前没有测试框架），保留以免与将来的手工脚本冲突：
`middleware/rateLimiter.js` 的 `isLoopbackIp`、`jobs/index.js` 的 `GC_INTERVAL_MS` / `STAT_INTERVAL_MS`、
`utils/uploadUrl.js` 的 `UPLOAD_URL_PREFIX`、`utils/imageRefTypes.js` 的 `REF_TYPES`、
`services/backup/lock.js` 的 `LOCK_PATH` / `LOCK_STALE_MS`、`services/auth/password.js` 的 `COST`、
`services/image/refs.js` 的 `REFERENCE_SOURCES`。

## 生产对账结果（2026-10-01，只读）

对账时部署版本：`f856daa`（与本机一致）。数据量：`post` 13 / `image` 98 / `diary` 4 / `post_image` 77 / `visit_log` 66。

- **生产缺 4 个外键**（都在图片系列，表建好之后才加的关联）：`post.cover_image_id`、`diary.cover_image_id`、`post_image.post_id`、`post_image.image_id`
- **这 4 项的孤儿引用校验全部为 0** → `reconcile-schema.js --apply` 可安全补齐（不会触发跳过项）
- `post_image` 的重复索引与全新库/本机一致（见上表）；生产另有 `moment` 这张无引用的遗留表
- 生产已有 `visit_log.post_id` 外键（SET NULL）——说明它的 `visit_log` 建表时关联已声明；本机缺这个外键且有 3 行孤儿数据

**尚未执行**：生产的结构补齐（`--apply`）等用户另行确认后按「备份 → dry-run → apply → 复核」执行；
回滚为逐个 `ALTER TABLE <表> DROP FOREIGN KEY <脚本报告的约束名>;`（脚本会把实际约束名打进报告）。

## reconcile-schema.js 用法（先读再跑）

```bash
cd server
node scripts/reconcile-schema.js            # dry-run：只报告「会补什么 / 跳过什么」，不执行
node scripts/reconcile-schema.js --apply    # 执行补齐（先校验孤儿引用，发现即跳过该项）
```

- 只补**模型已声明关联**的外键：`post.cover_image_id`、`diary.cover_image_id`、
  `post_image.post_id`、`post_image.image_id`、`visit_log.post_id`、
  `post_category_id` 与 `column_post` 的两条（这两组老库里通常已有，脚本只做幂等确认）；
  语义按 Sequelize 默认（可空 `belongsTo` → `ON DELETE SET NULL`；NOT NULL 的 `post_image.image_id` → `NO ACTION`）
- 幂等：存在性判定用 `(表, 列, 被引用表)` 而非约束名，重复执行第二次报告 0 变更
- 执行前建议先 `node scripts/backup.js`；回滚 = 对脚本报告的每个约束名执行
  `ALTER TABLE <表> DROP FOREIGN KEY <约束名>;`
- **本机 dry-run 现状（2026-10-01）**：4 项待补、1 项被挡住（`visit_log.post_id` 有 3 行孤儿，指向已不存在的文章）——
  挡住项需先人工确认那 3 行（删掉或改 NULL）再重跑；生产无挡住项
