# Yulabu Blog 后端

博客后端服务，基于 Express 5 + Sequelize 6 + MySQL。

## 技术栈

| 类别 | 技术 |
|---|---|
| 运行时 | Node.js |
| 框架 | Express 5 |
| 数据库 | MySQL |
| ORM | Sequelize 6 |
| 认证 | JWT（jsonwebtoken + bcrypt） |
| 图片上传 | multer + sharp |
| 模块别名 | module-alias |

## 功能

- 文章 CRUD：创建、更新、软删除、恢复、彻底删除、列表、详情
- 分类 / 标签管理
- 公告管理：显示 / 隐藏、置顶
- 管理员账号管理：增删改、修改密码
- JWT 登录鉴权
- 图片上传
  - 仅接受 jpg / png / webp
  - 新建文章先存临时目录，保存时只迁移被正文引用的图片
  - 编辑文章保存后清理未被引用的图片
  - 彻底删除文章时清理对应上传目录
  - 临时目录保留 1 天，启动时及每 24 小时自动清理

## 目录结构

```
server/
├── app.js                      # 入口：中间件、路由、数据库同步、启动定时任务（一行）
├── package.json
├── .env                        # 环境变量（不提交）
├── .env_example                # 环境变量模板
├── seed.js                     # 创建初始管理员
├── config/                     # 配置边界：只收「外部能定的值」（见「配置（config/）」）
│   ├── env.js                  # 全项目唯一读 process.env：默认值 / 类型转换 / 必填校验
│   ├── timezone.js             # 北京时间偏移（+08:00）的唯一事实
│   ├── database.js             # Sequelize 实例 + dbConfig（连接参数，备份链共用）
│   ├── auth.js                 # JWT 密钥与有效期（签发 / 验签共用）
│   ├── image.js                # 上传目录 / 缩略图 / 图片质量 / 上传限额
│   ├── backup.js               # 备份目录与保留份数
│   └── settings.js             # 站点设置（setting 表）键定义 + 文本↔强类型编解码
├── controllers/                # 业务逻辑（认 req/res）
├── services/                   # 领域能力：碰 I/O/DB、被 ≥2 个调用方共用、不认识 HTTP
│   ├── image/
│   │   ├── refs.js             # 图片引用账本（唯一出处）：谁引用了我 / 某类引用有哪些图
│   │   ├── derive.js           # 业务表的 URL/正文 → image_id 派生（保存时同步引用指针）
│   │   ├── store.js            # 文件层：转码落盘 / 物理删除
│   │   └── upload.js           # 上传落库：store + 建 image 记录（两个上传入口共用）
│   ├── ogImage.js              # 友链抓图：出站 HTTP + OG 元信息解析
│   └── backup/                 # 备份链（cron 与后台按钮共用）
│       ├── layout.js           # 目录布局与 dump 文件名白名单
│       ├── lock.js             # 跨进程互斥（cron 与 pm2 是两个进程）
│       ├── run.js              # dump / uploads 镜像 / 清理 / 列表（无 HTTP）
│       ├── export.js           # 导出包准备 + tar 流（无 HTTP）
│       └── assets.js           # 随包附带的 restore.sh 与恢复说明文本
├── jobs/                       # 定时任务：进程内调度、批量、幂等自愈、策略常量自带
│   ├── index.js                # 注册表：间隔 / 启动即跑 / 依赖声明（app.js 只调它）
│   ├── imageGc.js              # 孤儿图片回收 + 废弃草稿 + 临时文件兜底
│   ├── dailyStat.js            # visit_log → daily_stat 全量重算
│   └── visitGc.js              # 访问日志按自然日清理
├── models/                     # 数据模型与关联
├── routes/                     # 路由定义
├── middleware/                 # 管道层：鉴权、限流、错误处理、上传解析
├── errors/                     # 共享内核：AppError（dto / controllers / services 共用）
├── dto/                        # 入参校验
├── vo/                         # 出参格式化
├── scripts/                    # 人触发的入口：护栏 / 一次性迁移 / 定时任务的 CLI 壳
│   ├── check-errors.js         # 错误翻译表回归（23 条断言）
│   ├── check-layers.js         # 分层护栏（4 类断言，含 utils 纯度）
│   ├── gc.js / daily-stat.js / visit-gc.js   # 任务的 CLI 壳（手工触发）
│   ├── backup.js               # 备份 CLI 壳（cron 调用）
│   ├── sync-schema.js / migrate-image-ref.js # 幂等结构/数据迁移
└── utils/                      # 纯函数共享内核：无 I/O、无 DB、无副作用（护栏断言④ 把守）
    ├── date.js                 # 北京时间日界（「今天」的唯一入口）
    ├── log.js                  # 日志行格式（唯一出处）
    └── uploadUrl.js            # /uploads/ URL 契约：拼接（vo）与剥离（services）共用
```

## 快速开始

### 1. 环境要求

- Node.js >= 18
- MySQL 已启动

### 2. 安装依赖

```bash
cd server
npm install
```

### 3. 配置环境变量

复制 `.env_example` 为 `.env` 并修改：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=blog
PORT=3000
JWT_SECRET=随机字符串
UPLOAD_DIR=/var/lib/yulabu/uploads    # 上传目录绝对路径，默认项目根目录 /uploads
UPLOAD_MAX_SIZE=5242880               # 单张图片最大 5MB
```

必填项：`DB_NAME` / `DB_USER` / `JWT_SECRET`——缺失时服务启动即失败（报错写明缺哪个）。全部环境变量只在 `config/env.js` 读取，详见「配置（config/）」。

### 4. 创建数据库

```sql
CREATE DATABASE blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. 启动服务

```bash
npm run dev
```

首次启动会自动同步表结构。生产环境建议关闭 `sequelize.sync()` 或使用迁移工具。

### 6. 创建管理员

```bash
node seed.js
```

默认创建管理员 `yulabu / yulabu123`。

## API 文档

### 认证

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| POST | `/api/auth/login` | 管理员登录 | 否 |

请求：

```json
{
  "admin_name": "yulabu",
  "admin_password": "yulabu123"
}
```

响应：

```json
{
  "token": "eyJhbG...",
  "admin": {
    "id": 1,
    "name": "yulabu",
    "avatar": null
  }
}
```

### 文章

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| GET | `/api/posts` | 文章列表（分页） | 否 |
| GET | `/api/posts/:id` | 文章详情 | 否 |
| POST | `/api/posts` | 创建文章 | 是 |
| PUT | `/api/posts/:id` | 更新文章 | 是 |
| DELETE | `/api/posts/:id` | 软删除（移入回收站） | 是 |

创建 / 更新请求字段：

```json
{
  "post_title": "标题",
  "post_content": "正文 Markdown",
  "post_summary": "摘要",
  "post_author": "作者",
  "post_category_id": 1
}
```

创建文章时可额外传入 `temp_id`，保存后会将对应临时目录中的引用图片迁移到文章目录。

### 分类

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| GET | `/api/tags` | 分类列表（含文章数） | 否 |
| GET | `/api/tags/:id` | 分类详情 | 否 |
| POST | `/api/tags` | 创建分类 | 是 |
| PUT | `/api/tags/:id` | 更新分类 | 是 |
| DELETE | `/api/tags/:id` | 删除分类 | 是 |

### 公告

公开接口：

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| GET | `/api/notices` | 公开公告显示 | 否 |

管理接口（均需认证）：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/notices` | 所有公告 |
| GET | `/api/admin/notices/:id` | 公告详情 |
| POST | `/api/admin/notices` | 创建公告 |
| PUT | `/api/admin/notices/:id` | 更新公告 |
| DELETE | `/api/admin/notices/:id` | 删除公告 |
| PUT | `/api/admin/notices/:id/pin` | 切换置顶 |

### 图片上传

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| POST | `/api/upload/batch` | 批量上传图片 | 是 |

请求为 `multipart/form-data`：

- `images`：图片文件，最多 50 张
- `post_id` 或 `temp_id`：目标目录标识

响应：

```json
{
  "urls": [
    "/uploads/123/xxx.png",
    "/uploads/temp/abc/yyy.png"
  ]
}
```

### 管理后台

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/dashboard` | 工作台统计 |
| GET | `/api/admin/posts/trash` | 回收站列表 |
| PUT | `/api/admin/posts/:id/restore` | 恢复文章 |
| DELETE | `/api/admin/posts/:id/force` | 彻底删除文章 |
| GET | `/api/admin/admins` | 管理员列表 |
| GET | `/api/admin/admins/me` | 当前管理员 |
| POST | `/api/admin/admins` | 创建管理员 |
| PUT | `/api/admin/admins/:id` | 更新管理员资料 / 密码 |
| DELETE | `/api/admin/admins/:id` | 删除管理员 |

## 图片存储与清理

- 文章图片保存在 `UPLOAD_DIR/<postId>/`
- 新建文章未保存前，图片暂存在 `UPLOAD_DIR/temp/<tempId>/`
- 保存文章时只迁移正文引用的图片，未引用图片直接删除
- 编辑文章保存后，删除 `uploads/<postId>/` 中不再被引用的图片
- 彻底删除文章时删除 `uploads/<postId>/`
- 上传临时目录是 `UPLOAD_DIR/.tmp`，**按需创建**（首次上传才出现，模块加载不落磁盘），GC 每 24 小时清理其中超过保留期（1 天）的文件

## 架构说明

### 请求处理流程

```
请求 → 路由（未命中 → notFound：JSON 404） → auth 中间件 → Controller → DTO 校验 → Model → VO 格式化 → 响应
                                                        ↓ 抛错（throw AppError / 框架错误）
                                              errorHandler 统一兜底（唯一出口）+ 5xx 记 stderr
```

### 各层职责

| 层 | 职责 |
|---|---|
| Middleware | JWT 鉴权、限流、multer 文件解析、全局错误处理（管道层） |
| errors | AppError：业务异常类型，dto / controllers / services / jobs 共用（共享内核，不属于中间件层） |
| config | 外部输入边界：env 派生的环境配置（唯一出口 config/env.js）+ 站点设置契约（config/settings.js） |
| DTO | 白名单提取 + 参数校验，非法输入抛出 AppError |
| Controller | 调用 DTO → service / model → VO 格式化；**只有这层认 req/res** |
| VO | 转换为前端友好的驼峰 JSON |
| services | 领域能力：碰 I/O/DB、被 ≥2 个调用方共用、不认识 HTTP（图片账本/落盘、抓图、备份核心） |
| jobs | 定时任务：进程内调度、批量、幂等自愈、策略常量自带、失败不拖垮服务 |
| utils | 纯函数共享内核：无 I/O、无 DB、无副作用（date / log / uploadUrl） |

**三分判据（2026-09 重构确立）**：一个新文件该放哪儿，只看两件事——

1. **碰 I/O 吗？**（磁盘 / 数据库 / 网络 / 子进程）不碰 → `utils/`；碰了 → 继续问 ②。护栏 `scripts/check-layers.js` 断言④ 会挡住往 utils 里塞 I/O
2. **由时间驱动还是由调用方驱动？** 进程内定时器调度、批量改数据、幂等自愈 → `jobs/`；被请求或其它代码按需调用 → `services/`

配套约定：
- `services/` 与 `jobs/` 都不许出现 `req`/`res`（导出这类流式响应由 controller 接管管道：设置头、pipe、客户端断开时通知服务层）
- `jobs/` 的调度声明（间隔、启动即跑、依赖谁成功）集中在 `jobs/index.js`，`app.js` 只调 `startJobs()`；任务的手工入口统一为 `node scripts/<任务>.js`（CLI 壳负责 module-alias + dotenv + 退出码，任务模块本身不是程序）
- 任务失败只记日志、不抛给调用方（失败隔离），进度与失败日志由任务自己写（文案是任务的事）

### 配置（config/）

config/ 只收「外部能定的值」，分两类：

- **环境配置（运维在部署时定）**：`config/env.js` 是**后端唯一读 `process.env` 的文件**，负责默认值、类型转换与必填校验（缺 `DB_NAME` / `DB_USER` / `JWT_SECRET` 时**启动即失败**并写明缺哪个；这三项缺失以前会伪装成别的故障——缺 `JWT_SECRET` 时登录 500、其余后台接口回 401「token 无效或已过期」）。`config/{database,image,backup,auth}.js` 只从 env.js 派生语义，自己不读 env
- **站点设置（管理员在后台定）**：`config/settings.js` 是 setting 表的键定义与「文本 ↔ 强类型」唯一转换入口

**不进 config/ 的**：内部实现常量随代码走——限流阈值留在 `middleware/rateLimiter.js`、GC 保留期留在 `jobs/imageGc.js`、访问日志保留留在 `jobs/visitGc.js`、任务间隔留在 `jobs/index.js`、抓图超时留在 `services/ogImage.js`、允许格式留在 `services/image/store.js`、图表窗口白名单留在 `controllers/adminController.js`。判据：**这个值外部能定吗？被两层以上共用吗？**都不满足就留在自己的模块里。

两条配套不变量：

- `config/database.js` 具名导出 `{ sequelize, dbConfig }`；备份链（`services/backup/run.js`）的 dump 凭据与库名必须取 `dbConfig`——两套默认值会让「应用连的库」与「备的库」分叉
- 时区 `+08:00` 的唯一事实是 `config/timezone.js`（Sequelize 的 timezone 与 `utils/date.js` 的偏移量都从它派生，错开会出现「图表日期与 DB 分组差一天」）

护栏：`node scripts/check-layers.js`（零依赖、不连库）断言 4 类——env 唯一出口、依赖只能向下、`@config/env` 白名单、**utils 纯度**（禁 fs / child_process / sharp / sequelize / dotenv / module-alias / @models / @services / @jobs）。

### 错误处理（唯一出口）

- 业务错误统一 `throw new AppError(status, message)`；**不在中间件/控制器里自己写错误响应**——
  401 也走 throw，429 用 `errors/contract.js` 的形状，形状只有一处定义
- `middleware/errorHandler.js` 是唯一出口，四步走：`res.headersSent` 守卫（交回 Express 默认处理器，
  官方要求；本项目有流式导出端点，不是理论情况）→ 翻译表命中 → 通用兜底（**只放 4xx 通过**，
  5xx 与无 status 的意外错误一律 500，不许伪装成客户端错误）→ 写响应
- 翻译表 `errors/translate/*` 把第三方错误映射成 `{ status, message }`：
  - multer：单张超限 413 / 张数超限 413 / 字段名不对 400（未逐码映射的码 → 400 中文通用文案）
  - body-parser：JSON 语法 400 / 请求体超限 413 / charset 415
  - Sequelize：唯一约束 **409** / 外键 400 / 校验 400 / **连接类 503**（一个 ConnectionError 覆盖 7 个子类）
  - 新增错误源 = 加一个文件 + 在 `errors/translate/index.js` 数组里加一行
- 两条顺序约束（**具体类必须排在基类之前**）：`UniqueConstraintError` 在 `ValidationError` 之前、
  `ForeignKeyConstraintError` 在 `DatabaseError` 之前——顺序错了状态码会静默退化（409→400、400→500）
- Controller 无需手写 try-catch（Express 5 自动接住 async 抛错，全站没有一处手工 `next(err)`）
- 回归护栏：`node scripts/check-errors.js`（23 条断言，零依赖、不连库、不占端口）。依赖升级改了
  body-parser 的 `err.type` 字符串或 Sequelize 的错误类时，它会立刻红，而不是让错误静默变成 500

### 日志（只写 stdout/stderr，由 PM2 收集）

| 记什么 | 记在哪 | 说明 |
| --- | --- | --- |
| 5xx（含 `AppError(5xx)` 与 DB 连接类 503） | stderr → `/root/.pm2/logs/blog-server-error.log` | 带请求上下文 + 堆栈，可定位到请求 |
| 限流命中（写明哪个桶） | 同上 | 应用层唯一的节流/暴破信号 |
| 启动、GC、统计聚合、访问日志清理、备份进度 | stdout → `/root/.pm2/logs/blog-server-out.log` | 定时任务启动时先跑一次再进周期 |
| 4xx 业务拒绝 | **不记** | nginx access log 已有状态码/IP/UA，应用层重复记只会淹没真信号 |
| 静态资源 `/uploads/*` | **不记** | 同上 |
| 请求体、`Authorization` 头 | **绝不记** | 登录与改密接口的 body 是明文密码 |

行格式唯一出处 `utils/log.js`（时间戳带 `+08:00` 偏移，便于与 nginx 的时间戳对上）：

```
[err]  2026-09-29T20:15:03.123+08:00 GET /api/admin/backups 500 ip=203.0.113.7 name=SequelizeConnectionRefusedError :: <message>
[warn] 2026-09-29T20:15:03.123+08:00 限流命中 login ip=203.0.113.7 POST /api/auth/login
```

- **不自己写文件日志、不引日志库**：PM2 负责收集，轮转靠 `pm2-logrotate`（生产配置见
  `deploy/astro.md` 第八节「日志与运行时环境」）
- `AppError` 的 message 会**原样返回给客户端**（含 5xx）：只写可执行的人话
  （例「未找到 mysqldump，请先安装 mariadb-client」），绝不塞堆栈、密钥、内部路径
