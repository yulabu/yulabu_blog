# 博客前台（home）

Astro 7 群岛架构 + Vue 3 岛 + Tailwind v4（只做工具类与令牌，不引 preflight）。
2026-10 完成分层重构：取数只剩一套实现、骨架全站唯一、UI 原语集中、跨岛状态收口。

## 命令

```bash
npm install
npm run dev          # 本地开发（astro dev，端口 5174；/api 与 /uploads 由 vite 代理到 :3000）
npm run build        # 生产构建（静态预渲染 + SSR 服务端入口）
npm run check        # astro check（0 error 是门槛）
npm run check:layers # 分层护栏（8 条断言，零依赖）
npm run icons        # 重新生成离线图标子集（先在 scripts/build-icons.mjs 的 ICONS 里登记）
```

根目录的 `npm run dev:home` = 后端(:3000) + 前台(:5174) 一起起。

## 渲染分工

| 页面 | 渲染方式 | 说明 |
|---|---|---|
| `/` `/archive` `/about` `/friends` `/columns` `/diary` | 构建时预渲染 | frontmatter 顶层取数烘焙进 HTML，岛内水合后用 createSilentSync 对账（发新文章无需构建） |
| `/post/[id]` `/columns/[id]` `/404` | SSR（`export const prerender = false`） | 实时取数出完整 HTML 与 per-post og 标签 |

## 目录结构

```
src/
├── pages/            # 路由 + 取数 + 组装（唯一允许顶层 await 取数的地方）
├── layouts/          # Layout.astro：head / 主题内联脚本 / 常驻岛
├── islands/          # 页面级 Vue 岛（原 views/）
├── components/
│   ├── astro/        # 零 JS 静态件：PageFrame（全站唯一骨架）、SiteFooter
│   ├── ui/           # UI 原语：AppIcon / GlassPanel / ContentState / Pagination /
│   │                 #   CategoryChip / CoverFallback / SectionHeader / Skeleton
│   ├── common/       # 常驻件：Navbar / ToastHost / MusicPlayer / PostSplash
│   └── {home,diary,post,about}/  # 业务组件
├── api/              # 数据层：client.ts（唯一传输）+ 每个资源一个模块（契约与调用同处）
├── stores/           # 跨岛共享状态（模块级单例）：ui / tagFilter / toast / music
├── composables/      # 组件级行为（副作用与生命周期，无共享状态）
├── styles/           # tokens.css（设计令牌唯一出处）+ global.css + components.css
├── utils/            # 纯函数：date / format / diary / liveData / postSplash / cn
└── assets/           # 图片、音乐、icons.json
```

依赖方向只能向下：`pages → layouts/components/islands/api`；`islands → components/stores/api/utils`；
`api/`、`utils/` 不依赖任何组件或 store。`npm run check:layers` 会把这条规则与另外 7 条纪律变成断言。

## 数据层（唯一传输）

`src/api/client.ts` 是唯一认识 URL 前缀、超时与错误形状的地方（同构：构建期 / SSR / 浏览器共用）：

| 出入口 | 语义 | 用在哪 |
|---|---|---|
| `apiGet` / `apiPost` | 失败抛 `ApiError` | 「失败就是错误」的调用方 |
| `apiTry` / `apiTryDetail` | 失败返回判别联合（404 分流 + 重试一次） | SSR 详情页 |
| `apiSoft` | 失败返回 `null` + 一行告警 | 预渲染/SSR 列表取数（fail-soft，绝不拦构建） |

资源模块（`api/post.ts` 等）里同时放**端点、参数与返回类型**，类型以 `server/vo/*.js` 为基准。
构建期烘焙与客户端对账**必须走同一个函数**（如 `getPosts(1, POSTS_PAGE_SIZE)`）——
参数切片不一致会让指纹永不相等、每次访问无谓重绘（护栏断言④只允许 client.ts 出现裸 fetch 就是为了这个）。

## UI 层

- **设计令牌唯一出处是 `src/styles/tokens.css`**：颜色定义在 `@theme`（Tailwind 由此生成
  `bg-page` / `text-heading` / `border-line` 等工具类），暗色只改同一批变量的值
  （`html[data-theme="dark"]`），因此**颜色不需要 `dark:` 变体**。
- **不引 Tailwind 的 preflight**（`global.css` 只 import theme + utilities）：本项目 33 个
  存量组件依赖自己的 reset 语义，preflight 会额外重置 `img/svg`、`button`、`h1-h6`、`ul/ol`。
  reset 由 `@layer base` 显式声明，工具类在 utilities 层天然压过它。
- **一个组件要么全用工具类、要么全用手写 scoped CSS，不许混用同一属性**：无 layer 的
  scoped 样式永远压过有 layer 的工具类，混用会得到「类加了没反应」。
- 跨页逐字重复的布局类放 `styles/components.css`（`@layer components`）：`.card-grid`、
  `.page-container`、`.card-body` / `.card-title` / `.card-text`。
- 有行为/标记复用的做成组件放 `components/ui/`；纯静态的做成 `.astro`，需要水合的做成 Vue 岛。

## 状态层

跨岛共享状态一律用**模块级单例**（放 `stores/`）——每个岛是独立 Vue app 实例，
pinia 各注一份互不同步（已于 2026-10 删除）。三条纪律：

1. 只在客户端写（SSR 期从不调用写方法）；
2. 模块顶层不许直接碰 `window` / `localStorage`（`typeof` 守卫 + 函数内读取）；
3. SSR 首帧不读：主题由 `Layout.astro` 的内联脚本写在 `html[data-theme]` 上。

## 页面状态约定

- 加载：客户端兜底取数时用 `Skeleton`（骨架屏），不再用「加载中...」文本；
- 失败：`ContentState kind="error" retry-text="重新加载" @retry="..."`——页面上留下可重试的出口，
  不只弹一句 toast；
- 空：`ContentState kind="empty"`。

## 本地环境要求

- Node.js `^22.18.0 || >=24.12.0`
- 后端已启动（`http://localhost:3000`）；预渲染页在构建期取不到后端也能构建（fail-soft），
  只是产物里没有内容
