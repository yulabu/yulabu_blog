# Yulabu Blog 前端

博客前台与管理后台前端，基于 Vue 3 + Vite + TypeScript。

## 技术栈

- Vue 3.5（Composition API + `<script setup>`）
- Vue Router 4（History 模式）
- Vite 8
- TypeScript
- md-editor-v3（Markdown 编辑器）
- @iconify/vue（图标）

## 功能

### 前台

- 首页：欢迎横幅、个人卡片、分类标签、文章列表、公告板、音乐播放器
- 文章详情页：Markdown 渲染
- 按分类筛选文章

### 管理后台

- 工作台：今日新增 / 文章总数 / 已发布 / 回收站统计、最近文章、日历、快捷操作
- 文章管理：新建 / 编辑 / 删除（软删除）、分页列表
  - Markdown 编辑器支持粘贴/上传图片
  - 支持导入本地 Markdown 文章及其引用的图片
- 标签管理：新建 / 编辑 / 删除，显示各标签下文章数量
- 公告管理：新建 / 编辑 / 删除、显示/隐藏、置顶/取消置顶
- 回收站：查看已删除文章、恢复、彻底删除
- 用户与权限：管理员列表、新建管理员、编辑资料、修改密码
- 系统设置（占位页）

## 目录结构

```
frontend/
├── public/
├── src/
│   ├── assets/                 # 图片、音乐、图标等静态资源
│   ├── components/
│   │   ├── common/             # 通用行为组件
│   │   │   ├── BaseModal.vue
│   │   │   ├── MessageBox.vue
│   │   │   ├── Navbar.vue
│   │   │   └── Pagination.vue
│   │   ├── home/               # 前台页面组件
│   │   │   ├── AnnouncementBoard.vue
│   │   │   ├── MusicPlayer.vue
│   │   │   ├── PersonalCard.vue
│   │   │   ├── PostList.vue
│   │   │   ├── TagBox.vue
│   │   │   └── WelcomeBanner.vue
│   │   └── admin/              # 后台 UI 组件
│   │       ├── AdminButton.vue
│   │       ├── AdminDataTable.vue
│   │       ├── AdminHeader.vue
│   │       ├── AdminLayout.vue
│   │       ├── AdminModal.vue
│   │       ├── AdminPageCard.vue
│   │       ├── AdminSidebar.vue
│   │       ├── AdminStatusBadge.vue
│   │       ├── Calendar.vue
│   │       ├── DashboardWelcomeCard.vue
│   │       ├── ImportMarkdownModal.vue
│   │       └── forms/          # 表单原子组件
│   │           ├── AdminForm.vue
│   │           ├── AdminFormCheckbox.vue
│   │           ├── AdminFormField.vue
│   │           ├── AdminFormFile.vue
│   │           ├── AdminFormGroup.vue
│   │           ├── AdminFormInput.vue
│   │           ├── AdminFormRow.vue
│   │           ├── AdminFormSelect.vue
│   │           └── AdminMarkdownField.vue
│   ├── composables/
│   │   ├── useAdminList.ts     # 后台分页列表通用逻辑
│   │   ├── useAsyncAction.ts   # 异步操作 loading / 错误处理
│   │   ├── useConfirmDelete.ts # 删除二次确认
│   │   └── useMessageBox.ts    # alert / confirm / toast
│   ├── utils/
│   │   ├── request.ts          # 带 token 的请求封装
│   │   ├── date.ts             # 日期格式化
│   │   └── importMarkdown.ts   # 本地 Markdown 导入
│   ├── views/
│   │   ├── home/
│   │   │   ├── HomeView.vue
│   │   │   ├── LoginView.vue
│   │   │   └── PostDetailView.vue
│   │   └── admin/
│   │       ├── AdminDashboard.vue
│   │       ├── AdminNoticeEdit.vue
│   │       ├── AdminNoticeList.vue
│   │       ├── AdminPostEdit.vue
│   │       ├── AdminPostList.vue
│   │       ├── AdminSettings.vue
│   │       ├── AdminTagList.vue
│   │       ├── AdminTrash.vue
│   │       └── AdminUserList.vue
│   ├── router/
│   │   └── index.ts            # 路由配置与登录守卫
│   ├── App.vue
│   ├── main.ts
│   └── main.css
├── index.html
├── vite.config.ts
└── package.json
```

## 后台组件化说明

后台页面按“行为组件 + 皮肤组件”分层，避免重复样式和逻辑：

- **通用行为组件**（`common/`）：`BaseModal`、`Pagination`、`MessageBox` 等只负责交互行为。
- **后台皮肤组件**（`admin/`）：`AdminButton`、`AdminDataTable`、`AdminPageCard`、`AdminModal`、`AdminStatusBadge`、`AdminForm*` 等统一后台视觉风格。
- **列表逻辑复用**：`useAdminList`、`useConfirmDelete`、`useAsyncAction` 封装了后台列表的加载、分页、删除、异步操作。
- **表单原子组件**：`admin/forms/` 提供统一的输入、选择、复选、文件、Markdown 编辑器封装，编辑页和弹窗共用。

## 开发环境要求

- Node.js `^22.18.0 || >=24.12.0`
- 后端服务已启动并监听 `http://localhost:3000`

## 安装与启动

```bash
cd frontend
npm install
npm run dev
```

默认端口 `5173`。`vite.config.ts` 已将 `/api` 与 `/uploads` 代理到后端。

## 构建

```bash
# 类型检查 + 生产构建
npm run build

# 仅构建
npm run build-only

# 仅类型检查
npm run type-check

# 预览生产包
npm run preview
```

## 认证说明

管理后台通过 `localStorage` 中的 `token` 与 `admin` 信息鉴权。登录由后端 `/api/auth/login` 提供，`request.ts` 会自动在请求头附加：

```
Authorization: Bearer <token>
```

收到 401 响应时自动清理 token 并跳转登录页。

## 图片上传说明

- 编辑器中粘贴/上传的图片会调用 `/api/upload/batch`
- 新建文章时图片先进入临时目录 `uploads/temp/<tempId>/`
- 保存文章后，后端只把正文引用到的图片迁移到 `uploads/<postId>/`
- 编辑文章时直接上传到 `uploads/<postId>/`，保存后自动清理未被引用的图片
