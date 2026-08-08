# 博客前台

博客前台前端，基于 Vue 3 + Vite + TypeScript。

## 技术栈

- Vue 3.5（Composition API + `<script setup>`）
- Vue Router 4（History 模式）
- Vite 8
- TypeScript
- Pinia（UI 状态管理）
- md-editor-v3（Markdown 预览）
- @iconify/vue（图标）

## 功能

- 首页 Hero：全屏欢迎横幅、打字机效果、滚动收缩
- 文章列表：分页展示、按分类筛选、关键词搜索
- 文章详情：Markdown 渲染、代码高亮、文章目录
- 侧边栏：个人卡片、标签云、公告板、音乐播放器
- 白天/黑夜主题切换（localStorage 持久化）

## 目录结构

```
frontend/home/
├── public/
├── src/
│   ├── api/
│   │   ├── notice.ts
│   │   ├── post.ts
│   │   └── tag.ts
│   ├── assets/                 # 图片、音乐、图标等静态资源
│   ├── components/
│   │   ├── common/             # 通用组件
│   │   │   ├── BaseModal.vue
│   │   │   ├── LoadingOverlay.vue
│   │   │   ├── MessageBox.vue
│   │   │   ├── Navbar.vue
│   │   │   └── Pagination.vue
│   │   └── home/               # 前台页面组件
│   │       ├── AnnouncementBoard.vue
│   │       ├── HomeHero.vue
│   │       ├── MusicPlayer.vue
│   │       ├── PersonalCard.vue
│   │       ├── PostList.vue
│   │       ├── TagBox.vue
│   │       └── WelcomeBanner.vue
│   ├── composables/
│   │   └── useMessageBox.ts
│   ├── router/
│   │   └── index.ts
│   ├── stores/
│   │   └── ui.ts               # 主题与 Hero 折叠状态
│   ├── types/
│   │   └── api.ts
│   ├── utils/
│   │   ├── date.ts
│   │   └── http.ts
│   ├── views/
│   │   ├── HomeView.vue
│   │   └── PostDetailView.vue
│   ├── App.vue
│   ├── main.ts
│   └── main.css                # 全局样式与 CSS 主题变量
├── index.html
├── vite.config.ts
└── package.json
```

## 主题系统

`main.css` 通过 CSS 自定义属性定义完整的绿色主题设计系统，`[data-theme="dark"]` 覆盖暗色变量。`stores/ui.ts` 管理主题状态并持久化到 localStorage，WelcomeBanner 波浪使用 inline SVG 随主题变色。

## 开发环境要求

- Node.js `^22.18.0 || >=24.12.0`
- 后端服务已启动并监听 `http://localhost:3000`

## 安装与启动

```bash
cd frontend/home
npm install
npm run dev
```

默认端口 `5174`。`vite.config.ts` 已将 `/api` 与 `/uploads` 代理到后端。

## 构建

```bash
npm run build        # 类型检查 + 生产构建
npm run build-only   # 仅构建
npm run type-check   # 仅类型检查
npm run preview      # 预览生产包
```

## 路由

| 路径 | 页面 |
|------|------|
| `/` | 首页 |
| `/post/:id` | 文章详情 |

所有页面无需认证，直接访问。
