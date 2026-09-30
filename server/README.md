# Yulabu Blog 后端

博客后端服务：Express 5 + Sequelize 6（MySQL 协议，生产跑 MariaDB），部署在 Nginx 之后，监听 `127.0.0.1:3000`，同时服务博客前台（Astro SSR 回源）与管理后台。

提供：文章（草稿 / 发布 / 回收站）、分类、专栏（专栏内排序与上下篇）、日记、友链（外链图片 + 一键抓 OG）、图片上传与图片库、访问统计、站点设置、备份管理、管理员账号与 JWT 登录。

本文件是后端的**开发入口**：先看「快速开始」和「目录结构」把项目跑起来，再按「架构约定」改代码；生产部署命令与踩坑清单在仓库根 [AGENTS.md](../AGENTS.md) 与 [deploy/](../deploy/)。

## 技术栈

| 类别 | 技术 |
|---|---|
| 运行时 | Node.js 22 / 24 LTS（生产 22.23.2；前端包用 `engines` 声明，后端请用同一版本） |
| 框架 | Express 5（识别 async 抛错，控制器无需 try-catch） |
| 数据库 | MySQL 协议：生产 MariaDB 10.11，本地 MySQL / MariaDB 均可 |
| ORM | Sequelize 6（`timestamps` + `underscored`，时区固定 +08:00） |
| 认证 | JWT（jsonwebtoken + bcrypt） |
| 图片 | multer（流式落盘）+ sharp（webp 转码 / 缩略图） |
| 限流 | express-rate-limit 8.x（`trust proxy` 已设 `loopback`） |
| 模块别名 | module-alias（`@config` / `@services` … 见 package.json 的 `_moduleAliases`） |

## 快速开始

### 1. 环境要求

- Node.js 22 或 24 LTS（不要用奇数版，peer 依赖解析会出问题）
- 一个可连的 MySQL / MariaDB，库的字符集用 utf8mb4

### 2. 安装依赖

```bash
cd server
npm install
```

### 3. 配置环境变量

```bash
cp .env_example .env
```

常用变量（完整清单与注释见 `.env_example`）：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DB_NAME` / `DB_USER` | — | **必填** |
| `DB_PASSWORD` | 空 | 允许空密码（本机 MariaDB root 走 unix_socket 时就是空的） |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | |
| `JWT_SECRET` | — | **必填** |
| `JWT_EXPIRES_IN` | `7d` | 签发与验签共用 `config/auth.js` |
| `PORT` | `3000` | |
| `UPLOAD_DIR` | 仓库根 `uploads/` | 生产为 `/var/www/yulabu_blog/uploads` |
| `UPLOAD_MAX_SIZE` | 5 MB | 单张图片上限 |
| `UPLOAD_MAX_TOTAL_SIZE` | 20 MB | 单次请求总量；生产被 nginx 的 10m 先拦 |
| `UPLOAD_MAX_FILES` | 50 | 单次张数护栏（前端已分片上传） |
| `THUMB_WIDTH` / `IMAGE_QUALITY` | `400` / `85` | 缩略图宽（高按比例）、webp 质量 |
| `BACKUP_DIR` / `BACKUP_KEEP` | 仓库根 `backups/` / `30` | 备份目录与 dump 保留份数 |
| `SEED_ADMIN_NAME` / `SEED_ADMIN_PASSWORD` | `yulabu` / `yulabu123` | 仅 `node seed.js` 使用 |

必填项（`DB_NAME` / `DB_USER` / `JWT_SECRET`）缺失时**启动即失败**并写明缺哪个——配置缺失不再伪装成「登录 500、其它接口 401」。所有变量只由 `config/env.js` 读取，详见「配置（config/）」。

### 4. 建库

```sql
CREATE DATABASE blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. 启动

```bash
npm run dev     # nodemon 热重载
npm start       # 直接跑 app.js（生产由 PM2 守护）
```

启动时依次：`sequelize.sync()` 建表 → `scripts/sync-schema.js` 补齐 sync 不做的 ALTER → `startJobs()` 起定时任务。健康检查：`curl localhost:3000/` 返回 `Hello, Blog Backend!`。

### 6. 创建管理员

```bash
node seed.js
```

## 目录结构

```
server/
├── app.js                  # 进程入口：组装管道 → 路由 → 同步表结构 → 启动定时任务
├── seed.js                 # 创建初始管理员
├── .env / .env_example     # 环境变量（.env 不提交）
├── config/                 # 外部输入边界：环境配置（env 派生）+ 站点设置契约
├── errors/                 # 共享内核：AppError、错误响应形状、第三方错误翻译表
├── utils/                  # 共享内核：纯函数（无 I/O / DB / 副作用）
├── models/                 # 表定义与关联（sequelize.define）
├── dto/                    # 入参：白名单提取 + 校验，非法输入抛 AppError
├── vo/                     # 出参：组装成前端契约形状（命名以各文件为准，见「请求生命周期」）
├── services/               # 领域能力：碰 I/O/DB、被 ≥2 个调用方共用、不认识 HTTP
├── jobs/                   # 定时任务：进程内调度、批量、幂等自愈
├── middleware/             # 管道层：鉴权、限流、上传解析、404、错误出口
├── controllers/            # 业务编排：dto → service/model → vo（只有这层认 req/res）
├── routes/                 # 路由挂载（含写操作的 auth）
└── scripts/                # 人触发的入口：护栏 / CLI 壳 / 幂等迁移
```

各目录的详细职责、允许的依赖方向与「新文件放哪儿」的判据见下一节。上传目录默认是**仓库根**的 `uploads/`（`server/` 的同级，git 已忽略），生产用 `UPLOAD_DIR` 指向 `/var/www/yulabu_blog/uploads`。

### 数据表

12 张表，全部由 `sequelize.sync()` 建。**结构出处**：列 / 索引 / 外键都由模型声明（`models/*.js` 的 `indexes`、`models/index.js` 的关联）——`sync()` 建表时内联外键，并对**已存在**的表补齐「模型声明了但库里没有」的索引；它**不补列、不追加 ENUM 值**，这两类漂移归 `scripts/sync-schema.js`：

| 表 | 说明 |
|---|---|
| `post` | 文章。`post_status` = `published` / `draft` / `trash`；`post_cover` 是封面 URL 的真相源，`cover_image_id` 是保存时派生的引用指针 |
| `Tag` | 分类。库里真实表名就是首字母大写的 `Tag`（历史原因，别改名） |
| `blog_column` · `column_post` | 专栏与「专栏-文章」关联；`column_post.post_id` 唯一，一篇文章只属于一个专栏，专栏内顺序看 `sort_order` |
| `diary` | 日记。`images` 是单图契约（≤1 张，与 `cover_image_id` 一一对应） |
| `friend_link` | 友链。`avatar` / `preview_image` 只存外链，不进图片系统 |
| `image` | 图片元数据（`storage_path` / `thumb_path` / `file_size` / `orphan_since`），**不含引用语义** |
| `post_image` | 文章正文图关联（1:N），与各 `*_image_id` 列同为图片引用来源 |
| `admin` | 管理员账号（bcrypt 哈希） |
| `visit_log` · `daily_stat` | 访问明细（保留 90 个完整自然日）/ 每日聚合（永久保留） |
| `setting` | 站点设置 key/value，键定义在 `config/settings.js` |

## 架构约定

### 请求生命周期

```
HTTP 请求
  └─ express（app.js 的挂载顺序即语义）
       cors → express.json({limit:'2mb'}) → 空 body 补丁（还原 Express 4 的 req.body 契约）
       → 路由限流（登录 5/15min、公开 60/min、后台与图片 120/min、/uploads 静态 120/min）
       → 路由匹配（未命中 → notFound：JSON 404）
       → auth（/api/admin/* 整前缀；文章与分类的写操作单挂）
       → multer（仅上传路由：流式落到 UPLOAD_DIR/.tmp）
       → controller → dto 校验 → service / model → vo 组装 → res.json

任何一层 throw
  └─ errorHandler 统一兜底（唯一出口，形状 { message }）→ 5xx 记 stderr
```

对接的三个契约：

- **成功响应**：形状与命名以各 `vo/*` 为准（文章 / 图片 / 访问日志是驼峰，专栏 / 友链 / 日记沿用 snake_case），入参统一 snake_case 且只取白名单字段
- **错误响应**：恒为 `{ "message": "人话" }`，HTTP 状态码表意；形状只在 `errors/contract.js` 定义
- **分页**：文章 / 图片等用 `page` + `limit`（`limit` 上限 50），返回 `{ page, total, totalPages }`；日记用 `page` + `pageSize`（默认 20）

### 分层与依赖方向

依赖只能向下（`scripts/check-layers.js` 断言②会扫 require 边并拦下违规）：

| 层 | 职责 | 只能依赖 |
|---|---|---|
| `config/` | 外部输入边界（见下） | **不依赖任何项目模块**（共享内核） |
| `errors/` | `AppError` + 错误翻译表 + 响应形状 | 仅额外允许 `@config` |
| `utils/` | 纯函数：`date.js`（北京时间日界）、`log.js`（日志行格式）、`uploadUrl.js`（`/uploads/` 契约） | node 内置 + `@config` / `@errors` |
| `models/` | 表定义与关联 | `@config` / `@errors` |
| `dto/` `vo/` | 入参校验 / 出参格式化 | dto 只依赖 `@errors`；vo 另允许 `@utils`（utils 已保证是纯函数） |
| `services/` | 领域能力：碰 I/O/DB、被 ≥2 个调用方共用、**不认识 req/res** | `models` / `config` / `errors` / `utils` |
| `jobs/` | 定时任务：进程内调度、批量、幂等自愈、**不认识 req/res** | `services` 及其以下 |
| `middleware/` | 管道层：只被 `routes/*` 与 `app.js` 挂载，不放错误类型与业务逻辑 | `errors` / `config` / `utils` |
| `controllers/` `routes/` | HTTP 边界（只有这层认 req/res） | 不设限（路径：route → controller → service → model） |

**新文件放哪儿（2026-09 三分判据）**：只看两件事——

1. **碰 I/O 吗？**（磁盘 / DB / 网络 / 子进程）不碰 → `utils/`；碰了 → 问 ②。护栏断言④会挡住往 utils 塞 I/O
2. **由时间驱动还是由调用方驱动？** 进程内定时器调度、批量改数据、幂等自愈 → `jobs/`；被请求或其它代码按需调用 → `services/`

边界补充：`migrate-*` / `sync-schema` / `seed` 这类**有终点、人触发、跑完即弃**的脚本属于 `scripts/`，不是 job；备份由系统 cron / 后台按钮触发（不是进程内调度），所以是「CLI 壳 + `services/backup`」而不是 job。

### 配置（config/）

`config/` 只收「外部能定的值」，分两类：

- **环境配置（运维在部署时定）**：`config/env.js` 是**后端唯一读 `process.env` 的文件**，负责默认值、类型转换与必填校验。`config/{database,image,backup,auth}.js` 只从它派生语义，自己不读 env；`config/timezone.js` 是北京时间偏移（+08:00）的唯一事实
- **站点设置（管理员在后台定）**：`config/settings.js` 是 setting 表的键定义与「文本 ↔ 强类型」唯一转换入口。新增一个布尔设置项只需在这里登记一行（`dto/setting.dto.js` 直接读这份 schema），**不需要改表结构**（key/value 表，缺行即用默认值）；要加非布尔类型，另需扩 DTO 的类型分支

**不进 config/ 的**：内部实现常量随代码走——限流阈值留在 `middleware/rateLimiter.js`、GC 保留期留在 `jobs/imageGc.js`、访问日志保留期留在 `jobs/visitGc.js`、任务间隔留在 `jobs/index.js`、抓图超时留在 `services/ogImage.js`、允许的图片格式留在 `services/image/store.js`、图表窗口白名单留在 `controllers/adminController.js`。判据：**这个值外部能定吗？被两层以上共用吗？**都不满足就留在自己的模块里。

两条配套不变量：

- `config/database.js` 具名导出 `{ sequelize, dbConfig }`：备份链（`services/backup/run.js`）的 dump 凭据与库名必须取 `dbConfig`，两套默认值会让「应用连的库」与「dump 备的库」分叉
- 时区偏移只在 `config/timezone.js` 写一次：Sequelize 的 `timezone` 与 `utils/date.js` 的偏移量都从它派生——错开会出现「图表日期与 DB 分组差一天」

### 错误处理（唯一出口）

- 业务错误统一 `throw new AppError(status, message)`，**不在中间件 / 控制器里自己写错误响应**（401 也 throw，429 用 `errors/contract.js` 的形状）；Express 5 会自动接住 async 抛错，全站没有一处手工 `next(err)`
- `middleware/errorHandler.js` 是唯一出口，四步：`res.headersSent` 守卫（流式导出端点需要）→ 翻译表命中 → 通用兜底（**只放 4xx 通过**，5xx 与无 status 的意外错误一律 500）→ 写响应；日志策略只在这一处按最终状态码判定
- 翻译表 `errors/translate/*` 把第三方错误映射成 `{ status, message }`：multer（超限 413 / 字段名错 400）、body-parser（JSON 语法 400 / 超限 413 / charset 415）、Sequelize（唯一约束 **409** / 外键 400 / 校验 400 / 连接类 **503**）。新增错误源 = 加一个文件 + 在 `errors/translate/index.js` 数组里加一行
- 两条顺序约束（**具体类必须排在基类之前**）：`UniqueConstraintError` 在 `ValidationError` 前、`ForeignKeyConstraintError` 在 `DatabaseError` 前——顺序错了状态码会静默退化（409→400、400→500）

### 日志（只写 stdout/stderr，由 PM2 收集）

| 记什么 | 记在哪 | 说明 |
|---|---|---|
| 5xx（含 `AppError(5xx)` 与 DB 连接类 503） | stderr | 带请求上下文 + 堆栈 |
| 限流命中（写明哪个桶） | stderr | 应用层唯一的节流 / 暴破信号 |
| 启动、图片 GC、统计聚合、访问日志清理、备份进度 | stdout | 定时任务启动时先跑一次，再进周期 |
| 4xx 业务拒绝、`/uploads/*` 静态请求 | **不记** | nginx access log 已有状态码 / IP / UA |
| 请求体、`Authorization` 头 | **绝不记** | 登录与改密接口的 body 是明文密码 |

行格式唯一出处是 `utils/log.js`（时间戳带 `+08:00`，便于和 nginx 对齐）：

```
[err]  2026-09-29T20:15:03.123+08:00 GET /api/admin/backups 500 ip=203.0.113.7 name=SequelizeConnectionRefusedError :: <message>
[warn] 2026-09-29T20:15:03.123+08:00 限流命中 login ip=203.0.113.7 POST /api/auth/login
```

不自己写文件日志、不引日志库：轮转靠 PM2 的 `pm2-logrotate`（生产配置见 `deploy/astro.md` 第八节）。`AppError` 的 message 会**原样返回给客户端**（含 5xx），只写可执行的运维人话（例「未找到 mysqldump，请先安装 mariadb-client」），绝不塞堆栈、密钥、内部路径。

## 领域机制

### 图片系统（引用归业务表，image 只存元数据）

上传链路：`POST /api/images/upload` → multer 流式落到 `UPLOAD_DIR/.tmp` → sharp 转 webp（+ 400px 缩略图 `*.thumb.webp`）落到 `UPLOAD_DIR/YYYY/MM/` → 写 `image` 表（只存 `storage_path` / `thumb_path` / `file_size` / `orphan_since`）→ 每张返回 `{ image_id, url, thumb_url }`（形状唯一出处 `vo/image.vo.js` 的 `uploadedImageVO`，专栏封面上传共用同一形状）。

引用与回收：

- **引用由业务表持有**，`image` 表没有任何引用语义：1:1 封面类用 `post.cover_image_id` / `blog_column.cover_image_id` / `diary.cover_image_id`，1:N 正文图用 `post_image(post_id, image_id)`
- **API 契约全是 URL，id 只是内部派生结果**：保存文章 / 专栏 / 日记时，用 `services/image/derive.js` 把业务表里的 URL 与正文解析成 `image_id`（正文图全量 replace，幂等）；URL 归一化（相对路径 / 本站绝对域名 / 协议相对 / markdown title 后缀）只此一处，派生失败会在保存时打 `[image-ref]` 告警——「图显示着却被 GC 删」类问题先查这里
- **孤儿回收交给 `jobs/imageGc.js`**（启动即跑 + 每 24 小时）：按 `services/image/refs.js` 的账本 SQL 对账，三态处理——有引用清标记（复活）/ 无引用打标 / **标记超 24h 且文件创建超 72h** 才删文件与记录。所以删除文章、专栏、日记**不会即时删图**，后台图片库会短暂出现无主图，属正常
- **图片引用账本的唯一出处是 `services/image/refs.js` 的 `REFERENCE_SOURCES`**：它同时派生孤儿对账 SQL、后台图片库按类型筛图、反查引用位置。**新增持图业务只改这一处**（详见「常见改动指引」）
- 缩略图的消费者都是**小尺寸展示位**：首页文章列表的小卡封面与日记书架的封面（VO 的 `coverThumb`）——大图卡、文章页与过渡卡片仍用原图
- 友链图片**彻底外链化、完全退出图片系统**：`avatar` / `preview_image` 只收 `http(s)://` 或 `//`（拒绝 `/uploads/`——没有引用指针的本站路径会被 GC 当孤儿回收）；「抓图」= `services/ogImage.js` 抓 `og:image` 与 favicon，不下载不落盘

结构变更的部署顺序：`node scripts/sync-schema.js` → `node scripts/migrate-image-ref.js`（两个都幂等）→ `pm2 restart blog-server`。

### 访问统计（visit_log + daily_stat）

- `visit_log` 存原始明细（公开写入、后台分页查看、今日实时统计），保留 90 个**完整自然日**；`daily_stat` 存每日聚合（一天一行，**永久保留**）
- `jobs/dailyStat.js` 每 10 分钟全量重算并 UPSERT（幂等自愈，启动即跑一次自动回填）；`jobs/visitGc.js` 每 24 小时清理过期明细，**必须先聚合成功才清理**（依赖声明在 `jobs/index.js`）
- 工作台折线图与「总浏览量 / 总独立访客」读 `daily_stat`；「今日 PV / UV」实时读 `visit_log`
- 口径取舍：总量是「各日去重 UV 之和」，长期访客会被逐日重复计入（偏大但永不缩水）；「清空访问日志」只删明细，不影响已归档总量
- 后端判定「今天」一律走 `utils/date.js` 的 `beijingDateStr` / `beijingDayStart` / `beijingYearMonth`：库里 DATETIME 按 +08:00 存墙钟，而生产 Node 进程时区可能是 UTC，用 `new Date().setHours(0,0,0,0)` 会错开 8 小时
- 三处曾用进程本地口径、2026-09-30 已统一为北京自然日：后台访问日志筛选（`today` / `7days`（含今天共 7 天）/ `30days`）、工作台「今日新增」卡、文章归档的年月分组。规则由护栏断言⑤ 守着：`setHours(` 只允许出现在 `utils/date.js`
- `visit_log` 的 `created_at` 索引在 `models/VisitLog.js` 里声明（范围筛选与 `visitGc` 的删除都走它；`post_id` 的索引由外键自带，不重复声明）——改索引＝改模型 + 重启，`sync()` 会补上

### 备份

- 触发：系统 cron（每天 04:00，见 `deploy/backup.md`）或后台「备份管理」页 → 都落到 `services/backup/run.js`
- 产物在 `BACKUP_DIR`（默认 `<仓库根>/backups`）：`db/` 存 dump（保留 `BACKUP_KEEP` 份，超出从最旧清理）、`uploads/` 为 rsync 镜像；`<1KB` 的 dump 视为失败并删除
- dump 命令自动探测 `mariadb-dump` → `mysqldump`，凭据经临时 `defaults-extra-file`（chmod 600）传入；库名与凭据取 `config/database.js` 的 `dbConfig`
- 备份与导出经 `backups/.lock` 文件锁跨进程互斥（cron 与 PM2 是两个进程），重复触发返回 409；导出包 = dump + uploads 镜像 + `restore.sh` + 恢复说明，**不含 `.env`**
- 后台导出走流式下载，客户端断开时会结束 tar 进程并释放锁（`services/backup/export.js`）

## 定时任务

| 任务 | 间隔 | 启动即跑 | 做什么 |
|---|---|---|---|
| `image-gc` | 24h | 是 | 孤儿图片三态回收 + 废弃草稿清理 + `.tmp` 残留兜底 |
| `daily-stat` | 10min | 是 | `visit_log` → `daily_stat` 全量重算 |
| `visit-gc` | 24h | 是 | 按北京自然日清理过期访问明细（依赖 `daily-stat` 成功） |

调度声明（间隔 / 启动即跑 / 依赖谁成功）集中在 `jobs/index.js`，`app.js` 只调 `startJobs()`；任务自带进度与失败日志、失败只记不抛（一个任务挂掉不影响 HTTP 服务与其它任务）。手工入口统一为 CLI 壳：`node scripts/gc.js` / `daily-stat.js` / `visit-gc.js`（壳负责 module-alias + dotenv + 退出码，任务模块本身不是程序）。

`image-gc` 的三件事各有阈值（常量集中在 `jobs/imageGc.js` 顶部）：孤儿打标后宽限 24 小时、文件创建不足 72 小时不删、草稿超 30 天未更新即清理、`.tmp` 残留超 1 小时清理。

## API 一览

认证约定：`/api/admin/*` 整个前缀受 auth 保护（`routes/adminRoutes.js` 里 `router.use(auth)`）；挂在公开路由下的写操作（文章、分类）单独挂 auth——历史路径如此，**不改 URL**（前台与后台是各自独立的构建产物，改路径要一起上线）。请求头 `Authorization: Bearer <token>`。

### 公开接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 管理员登录（限流 5 次 / 15 分钟） |
| GET | `/api/posts` | 文章列表（`page` / `limit` / `category_id` / `q`） |
| GET | `/api/posts/archive` | 归档（按年月分组计数） |
| GET | `/api/posts/:id` | 文章详情（仅 `published`） |
| GET | `/api/posts/:id/prev` · `/next` | 同专栏上一篇 / 下一篇 |
| GET | `/api/tags` · `/api/tags/:id` | 分类列表（含文章数）/ 详情 |
| GET | `/api/columns` · `/api/columns/:id` | 专栏列表 / 详情 |
| GET | `/api/diaries` | 日记书架（`page` / `pageSize`） |
| GET | `/api/friendlinks` | 友链列表（仅 `show`） |
| GET | `/api/settings` | 公开站点设置（如 `comments_enabled`） |
| POST | `/api/visits` | 记录一次访问（`page_path` 必填，`post_id` 可选） |

登录（`POST /api/auth/login`）请求体与成功响应：

```json
{ "admin_name": "yulabu", "admin_password": "******" }
```

```json
{ "token": "eyJhbG...", "admin": { "id": 1, "name": "yulabu", "avatar": null } }
```

### 内容写操作（需登录）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/posts` | 创建文章（`post_status` 只接受 `draft` / `published`；草稿允许空标题正文） |
| PUT | `/api/posts/:id` | 更新文章（可切 `draft` / `published` / `trash`） |
| PUT | `/api/posts/:id/unbind-images` | 按当前正文重建图片引用（同步用） |
| DELETE | `/api/posts/:id` | 移入回收站（软删） |
| POST | `/api/tags` | 创建分类 |
| PUT · DELETE | `/api/tags/:id` | 更新 / 删除分类 |
| POST | `/api/images/upload` | 批量上传图片（`multipart/form-data`，字段 `images`，最多 50 张） |

上传响应（`UploadedImage` 契约，后台批量上传与专栏封面上传共用同一形状）：

```json
{ "images": [ { "image_id": 12, "url": "/uploads/2026/09/xxx.webp", "thumb_url": "/uploads/2026/09/xxx.thumb.webp" } ] }
```

### 管理后台 `/api/admin/*`（全部需登录）

| 分组 | 端点 |
|---|---|
| 账号 | `GET /admins`、`GET /admins/me`、`POST /admins`、`PUT /admins/:id`（资料 / 密码）、`DELETE /admins/:id` |
| 工作台 | `GET /dashboard`、`GET /dashboard/charts?range=7days\|30days\|90days\|365days` |
| 文章 | `GET /posts`（含草稿 / 回收站）、`GET /posts/:id`、`PUT /posts/:id/restore`（恢复为草稿）、`DELETE /posts/:id/force`（彻底删除） |
| 专栏 | `GET /columns`、`POST /columns`、`PUT /columns/:id`、`DELETE /columns/:id`、`POST /columns/:id/cover`（multipart，字段 `image`）、`GET /columns/:id/posts`、`POST /columns/:id/posts`、`DELETE /columns/:id/posts/:postId`、`PUT /columns/:id/order` |
| 日记 | `GET /diaries`、`GET /diaries/:id`、`POST /diaries`、`PUT /diaries/:id`、`DELETE /diaries/:id` |
| 友链 | `GET /friendlinks`、`GET /friendlinks/:id`、`POST /friendlinks`、`PUT /friendlinks/:id`、`PUT /friendlinks/:id/preview`（抓 OG 图）、`DELETE /friendlinks/:id` |
| 图片库 | `GET /images?type=post_content\|cover\|other`、`GET /images/:id`、`DELETE /images/batch`、`DELETE /images/:id` |
| 访问 | `GET /visits`（`dateRange` / `ip` / `post_id`）、`GET /visits/stats`、`DELETE /visits`（清空明细） |
| 设置 | `GET /settings`、`PUT /settings` |
| 备份 | `GET /backups`、`POST /backups`、`GET /backups/:filename/export`（流式下载）、`DELETE /backups/:filename` |

出错时所有接口返回同一形状（状态码表意：400 / 401 / 404 / 409 / 413 / 429 / 500 / 503 …）：

```json
{ "message": "标题不能为空" }
```

## 脚本与护栏

零依赖、不连库、不占端口，随时可跑（动了错误层 / 依赖边 / 配置读法 / 任务分层就顺手跑一遍）：

| 命令 | 作用 |
|---|---|
| `node scripts/check-errors.js` | 错误层回归：23 条断言，守着翻译表与「5xx 必记日志」；**升级 body-parser / sequelize / multer 后必须重跑**（翻译表依赖它们内部的常量与错误类） |
| `node scripts/check-layers.js` | 分层护栏 5 条断言：① `process.env` 只出现在 `config/env.js` ② 依赖只能向下 ③ `@config/env` 只有 config 内部与 app.js / seed.js 能引用 ④ `utils/` 必须是纯函数 ⑤ 取本地零点只允许在 `utils/date.js`（`setHours` 不许出现在别处） |

需要连库 / 改数据的脚本（幂等，可重复执行）：

| 命令 | 作用 |
|---|---|
| `node scripts/sync-schema.js` | 补齐 `sequelize.sync()` 不做的 ALTER（新增列 / ENUM 追加）。**ENUM 新值必须追加在末尾**（MySQL 按索引存储，插中间会让存量数据错位） |
| `node scripts/migrate-image-ref.js` | 一次性数据迁移：把图片引用从废弃的 `image.reference_type/reference_id` 迁到业务表外键 / 关联表（以 URL 匹配为准） |
| `node scripts/gc.js` · `daily-stat.js` · `visit-gc.js` | 三个定时任务的手工入口 |
| `node scripts/backup.js` | 备份 CLI（cron 调用的就是它） |

新增表由 `sequelize.sync()` 启动时自动创建；**已有表的新列 / 新 ENUM 值 sync 不管**，要写进 `sync-schema.js`。

## 常见改动指引

**新增一个接口**：`routes/` 挂路径（写操作挂 `auth`）→ `controllers/` 编排 → 入参走 `dto/`（分页用 `dto/common.dto.js` 的 `paginate`）→ 出参走 `vo/` → 需要碰 DB / 磁盘的领域逻辑放 `services/`。错误一律 `throw new AppError(status, message)`，不要在控制器里写错误响应。

**新增持图业务**（改这三处，缺一处会把在用的图当成孤儿删掉）：

1. 业务表加 `*_image_id` 列（1:1）或建关联表（1:N）
2. 保存逻辑用 `services/image/derive.js` 从 URL 派生 `image_id`
3. 在 `services/image/refs.js` 的 `REFERENCE_SOURCES` 加一条（孤儿对账、按类型筛图、反查引用位置都从它派生）

**新增环境变量**：只改 `config/env.js`（默认值 + 类型转换 + 必填校验）与 `.env_example`；消费者从 `@config/<domain>` 取，不要直接读 `process.env`；改完跑 `check-layers.js`。

**改表结构**：新表不用管（`sync()` 自动建）；**索引与外键写进模型**（建表时生效，已存在的表重启即补索引）；新列 / ENUM 值写进 `scripts/sync-schema.js`，部署时执行；涉及图片引用的变更按「图片系统」一节的顺序跑迁移。

**新增定时任务**：写 `jobs/<name>.js`（导出 `run()`，自带进度与失败日志、失败返回 `false` 不抛）→ 在 `jobs/index.js` 登记间隔、是否启动即跑、依赖谁成功 → 需要手工入口就在 `scripts/` 加一个 CLI 壳（`module-alias` + `dotenv` + 退出码）。内部阈值留在任务文件里，不进 `config/`。

## 相关文档

- 仓库根 [AGENTS.md](../AGENTS.md)：生产环境清单、部署流程、开发惯例（部署只走 GitHub 推送这一条路径）
- [deploy/astro.md](../deploy/astro.md)：前台 Astro 的 nginx / PM2 配置与回滚、上传链路的三层上限、日志与运行时环境
- [deploy/backup.md](../deploy/backup.md)：备份 cron 配置、恢复与异机迁移步骤
- [frontend/home/README.md](../frontend/home/README.md) · [frontend/admin/README.md](../frontend/admin/README.md)：两个前端的开发说明
