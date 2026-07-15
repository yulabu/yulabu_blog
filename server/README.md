# Blog Backend

博客后端服务，基于 Express + Sequelize + MySQL。

## 技术栈

| 类别 | 技术 |
|------|------|
| 运行时 | Node.js |
| 框架 | Express 5 |
| 数据库 | MySQL |
| ORM | Sequelize 6 |
| 认证 | JWT（jsonwebtoken + bcrypt） |
| 包管理 | CommonJS |

## 目录结构

```
server/
├── app.js                      # 入口，挂载中间件和路由
├── package.json
├── .env                        # 环境变量（不提交）
├── .env_example                # 环境变量模板
├── seed.js                     # 一次性脚本，创建管理员账号
│
├── config/
│   └── database.js             # Sequelize 数据库连接配置
│
├── models/                     # 数据模型（Sequelize）
│   ├── index.js                # 模型统一入口 + 关联定义
│   ├── Post.js                 # 文章表
│   ├── Tag.js                  # 分类/标签表
│   └── Admin.js                # 管理员表
│
├── controllers/                # 控制器（业务逻辑）
│   ├── postController.js       # 文章 CRUD
│   └── authController.js       # 管理员登录
│
├── routes/                     # 路由定义
│   ├── postRoutes.js
│   └── authRoutes.js
│
├── middleware/                  # Express 中间件
│   ├── auth.js                 # JWT 鉴权
│   ├── AppError.js             # 自定义错误类
│   └── errorHandler.js         # 全局错误处理
│
├── dto/                        # Data Transfer Object（入参校验）
│   ├── post.dto.js
│   └── auth.dto.js
│
└── vo/                         # View Object（出参格式化）
    ├── post.vo.js
    └── auth.vo.js
```

## 快速开始

### 1. 环境准备

- Node.js >= 18
- MySQL 服务已启动

### 2. 安装依赖

```bash
cd server
npm install
```

### 3. 配置

创建 `.env` 文件（可复制 `.env_example` 修改）：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=blog
PORT=3000
JWT_SECRET=随机字符串，用于JWT签名
```

MySQL 中先建库：

```sql
CREATE DATABASE blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. 启动

```bash
npm run dev
```

服务默认监听 `http://localhost:3000`，首次启动会自动建表。

### 5. 创建管理员

```bash
node seed.js
```

此脚本会创建一个管理员账号，用户名和密码见 `seed.js` 文件内配置。

## API 文档

### 认证

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|:--:|
| POST | `/api/auth/login` | 管理员登录 | 否 |

**登录请求：**
```json
{
  "admin_name": "admin",
  "admin_password": "your_password"
}
```

**登录响应：**
```json
{
  "token": "eyJhbG...",
  "admin": {
    "id": 1,
    "name": "admin",
    "avatar": null
  }
}
```

---

### 文章

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|:--:|
| GET | `/api/posts` | 文章列表（分页） | 否 |
| GET | `/api/posts/:id` | 文章详情 | 否 |
| POST | `/api/posts` | 创建文章 | 是 |
| PUT | `/api/posts/:id` | 更新文章 | 是 |
| DELETE | `/api/posts/:id` | 删除文章（软删除） | 是 |

**认证方式**：请求头携带 `Authorization: Bearer <token>`

**分页参数**：`GET /api/posts?page=1&limit=10`（limit 最大 50）

**创建文章请求：**
```json
{
  "post_title": "文章标题",
  "post_content": "正文内容（支持长文本）",
  "post_summary": "摘要（可选，最多128字）",
  "post_author": "作者名（可选，默认'匿名'）",
  "post_category_id": 1
}
```

**创建响应：**
```json
{
  "id": 1,
  "message": "创建成功"
}
```

**文章列表响应：**
```json
{
  "posts": [
    {
      "id": 1,
      "title": "文章标题",
      "summary": "摘要",
      "author": "作者",
      "category": {
        "id": 1,
        "name": "JavaScript",
        "color": "#f7df1e"
      },
      "status": "published",
      "createdAt": "2026-07-13T..."
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 10
}
```

**文章详情响应**：与列表项相同，额外包含 `content` 和 `updatedAt` 字段。

---

## 架构说明

### 请求处理流程

```
请求 → 路由 → 中间件(auth) → Controller → DTO(入参校验) → 数据库操作 → VO(出参格式化) → 响应
                                                         ↓ 异常
                                                    errorHandler(统一兜底)
```

### 各层职责

| 层 | 文件 | 职责 |
|----|------|------|
| Middleware | `middleware/auth.js` | 验证 JWT，注入 `req.admin` |
| DTO | `dto/*.js` | 从请求体中白名单提取字段，校验必填/长度/类型，`throw AppError` 拒绝非法输入 |
| Controller | `controllers/*.js` | 调用 DTO 洗数据 → 调用 Model 操作数据库 → 调用 VO 格式化输出 |
| VO | `vo/*.js` | 将 Sequelize 对象转为前端需要的驼峰 JSON，去除内部字段 |
| Error Handler | `middleware/errorHandler.js` | 全局兜底，AppError 返回对应状态码+消息；未知错误返回 500 |

### 错误处理

- 业务错误统一 `throw new AppError(status, message)`
- `errorHandler` 自动捕获，`AppError` 返回指定状态码，其他错误返回 500
- Controller 无需手写 try-catch
