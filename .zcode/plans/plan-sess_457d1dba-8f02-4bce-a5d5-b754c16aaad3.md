## 根因（已定位到 Astro 源码，非猜测）

自定义光标代码本身完好（`useAnimatedCursor.ts`、`public/cursor/*.ani`、`ani-cursor` 依赖都在，`dist/client/cursor/` 也有产物），坏在**注入的 `<style>` 被 ClientRouter 软导航删掉后再也没补回来**：

1. 光标 CSS 是运行时生成后 `document.head.appendChild(style)` 注入的（`src/composables/useAnimatedCursor.ts:83-88`、`:126`）。
2. 每次软导航，Astro 的 `swap()` 会跑 `swapHeadElements()`（`node_modules/astro/dist/transitions/swap-functions.js:55-92`、`:223-230`）：它遍历 head 里**每个**子节点，只保留「带 `data-astro-transition-persist`」「新文档里同 href 的 `link[rel=stylesheet]`」「新文档里 textContent 完全相同的 `<style>`」「字体 preload」四类；我们的注入样式**四类都不占**，直接 `el.remove()`（`:70`）。
3. 同一次 `swap()` 里的 `deselectScripts()`（`:224`）把 Layout 的打包脚本（同 hashed src）标记为已执行，软导航后不会重跑；而 `Layout.astro` 虽然在 `astro:page-load` 又调了一次 `startEffects()`（`astro/dist/transitions/router.js:350-354` 确认 page-load 在 swap 之后触发），但 `initCursors()` 在 `if (initialized) return`（`:112`）就返回了，永远不会重新注入。

**症状吻合**：冷启动整页加载时光标正常，站内点过一次链接（软导航）后光标**永久消失**，必须硬刷新才回来。

## 修复方案（3 个文件，改动都很小）

### ① `frontend/home/src/composables/useAnimatedCursor.ts`（核心）
缓存生成的 CSS，重复调用时检测样式是否还在文档里，掉了就同步补回：
- 新增状态 `let cursorsCss: string | null = null`；
- 新增 `ensureInjected()`：`if (!cursorsCss || styleEl?.isConnected) return` 时直接返回，否则 `styleEl = injectStyle(cursorsCss)`（用缓存，**不再重复 fetch 那 12 个 .ani**）；
- `initCursors()` 改为：`if (initialized) { ensureInjected(); return }`；首次构建完 CSS 后 `cursorsCss = css` 再走 `ensureInjected()`；
- `destroy()` 里补 `cursorsCss = null`，保持语义一致。

### ② `frontend/home/src/layouts/Layout.astro`（防闪一帧）
在已有的 `astro:page-load` 监听之外，再加一条 `document.addEventListener('astro:after-swap', startEffects)`。`after-swap` 在 view-transition 的 update 回调内、浏览器取「新快照」之前触发，补回样式不会被拍到；`startEffects` 内部两个 composable 都有幂等守卫，重复调用安全。首次整页加载不触发 `after-swap`，行为不变。

### ③ 附带修复：`frontend/home/src/composables/useDayPeriod.ts`（同一根因，可选）
`data-period` 是同一类受害者：`swapRootAttributes()`（`swap-functions.js:46-54`）会**清掉 html 上所有属性**再套新文档的（新文档里没有 `data-period`），而 `start()` 的 `if (started) return` 让它也补不回来 → 软导航后首页 WelcomeBanner 的晨/暮/夜色调（`WelcomeBanner.vue:115-162`）静默失效。改法：`start()` 在 `started` 为 true 时改成 `apply(); return`（仍不发新定时器）。
**这条超出你原始提问，只是同一处根因、一行改动；不想动可以让我去掉。**

## 不动的部分
- `setLoadingCursor()` + `busy.ani` 是**已死代码**：旧 App.vue 里的 `watch(() => uiStore.pageLoading, …)` 随迁移删掉，`pageLoading` 在整个 `src/` 里已不存在（迁移后由 PostSplash 接棒加载体验）。本次不删也不复活，需要清理可另开一次。
- 光标图片资源、`ani-cursor` 依赖、CURSOR_MAP 选择器、静态首帧方案（`2cba084` 的防闪烁改动）全部保持原样。

## 验证
1. `cd frontend/home && npm run build && npm run check`（项目门槛：build 通过 + astro check 0 error）。
2. 本地起 dev（`npm run dev`，5174），用浏览器实测：首页读 head 里注入的 `<style>`（含 `x-win-bitmap`）→ 点导航软跳到 `/archive` → **样式仍在**、`document.documentElement.dataset.period` 仍在；控制台无新增报错。
3. 顺带确认 theme / Hero 折叠态 / 音乐播放器 persist 未受影响。

## 部署
纯前端改动，无数据库/结构变更：`git commit` → 服务器 `git pull` → `cd frontend/home && npm install && npm run build` → `pm2 restart blog-web`（Layout 变更进了 SSR 入口包）。