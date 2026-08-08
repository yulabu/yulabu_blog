# Yulabu Blog

个人博客全栈项目。

## 项目结构

```
yulabu_blog/
├── server/              # Express 5 + Sequelize 6 + MySQL 后端
├── frontend/
│   ├── home/            # 前台博客 (Vue 3 + Vite + TypeScript)
│   └── admin/           # 管理后台 (Vue 3 + Vite + TypeScript)
└── package.json         # 根脚本
```

## 一键启动

根目录已配置 `concurrently`，可同时启动后端 + 前端：

```bash
# 启动博客前台
npm run dev:home

# 启动管理后台
npm run dev:admin
```

默认访问地址：

| 服务 | 地址 |
|------|------|
| 博客前台 | `http://localhost:5174` |
| 管理后台 | `http://localhost:5175` |
| 后端 API | `http://localhost:3000` |

## 文档

- 博客前台：[frontend/home/README.md](frontend/home/README.md)
- 管理后台：[frontend/admin/README.md](frontend/admin/README.md)
- 后端：[server/README.md](server/README.md)
