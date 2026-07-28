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
├── app.js                      # 入口：中间件、路由、数据库同步、定时清理
├── package.json
├── .env                        # 环境变量（不提交）
├── .env_example                # 环境变量模板
├── seed.js                     # 创建初始管理员
├── config/
│   ├── database.js             # Sequelize 配置
│   └── upload.js               # 上传目录配置
├── controllers/                # 业务逻辑
├── models/                     # 数据模型与关联
├── routes/                     # 路由定义
├── middleware/                 # 鉴权、错误处理、上传解析
├── dto/                        # 入参校验
├── vo/                         # 出参格式化
└── utils/
    └── image.js                # 图片保存、迁移、清理
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
- 临时目录保留 1 天，服务启动及每 24 小时自动清理

## 架构说明

### 请求处理流程

```
请求 → 路由 → auth 中间件 → Controller → DTO 校验 → Model → VO 格式化 → 响应
                                          ↓ 异常
                                errorHandler 统一兜底
```

### 各层职责

| 层 | 职责 |
|---|---|
| Middleware | JWT 鉴权、multer 文件解析、全局错误处理 |
| DTO | 白名单提取 + 参数校验，非法输入抛出 AppError |
| Controller | 调用 DTO → 操作数据库 → VO 格式化 |
| VO | 转换为前端友好的驼峰 JSON |
| utils/image | 图片保存、文章图片同步、临时目录清理 |

### 错误处理

- 业务错误统一使用 `throw new AppError(status, message)`
- `errorHandler` 捕获后返回对应状态码与消息
- Controller 无需手写 try-catch
