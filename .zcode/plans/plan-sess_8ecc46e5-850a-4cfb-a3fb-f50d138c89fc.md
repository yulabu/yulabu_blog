## 专栏 / 上下篇 过渡卡片丢封面：改动计划

### 根因（已实测确认）
`server/vo/column.vo.js` 的 `columnPostItem()` 不吐 `cover`，实测 `GET /api/columns/1` 的 `posts[0]` 字段为 `[id, title, summary, category, createdAt, sort]`。前端点击时把整个条目交给 `markPostSplash()`，卡片读 `post.cover` → `undefined` → 走首字兜底。同文件的 `prevNextVO()` 同样只吐 `id/title`，所以专栏内多篇文章时上下篇跳转也会丢封面。首页列表与归档走 `postSummary()`，本就带 cover，不受影响。

### 改动一：`server/vo/column.vo.js`（唯一的逻辑改动）
- `columnPostItem()` 在 `summary` 之后加 `cover: post.post_cover || null,`
- `prevNextVO()` 在 `title` 之后加 `cover: post.post_cover || null,`
- 各加一行说明注释（点明"漏字段会让过渡卡片丢封面"这个约束）

不需要动查询：`getColumnById` 与 `getPrevPost/getNextPost` 都是 `include` 整个 Post 模型，`post_cover` 早已加载。不需要动前端逻辑：`ColumnDetailView.vue` / `PostDetailView.vue` 已经把整个对象交给 `markPostSplash`，`postSplash.ts` 本来就读 `post.cover`。

### 改动二：`frontend/home/src/types/api.ts`（纯类型，不影响产物）
- `ColumnPostItem` 加 `cover: string | null`
- `PrevNextPost` 的 `post` 改为 `{ id: number; title: string; cover: string | null } | null`
- `ArchivePost` 补 `cover: string | null`（接口本来就返回，类型与实现不符）

### 无风险点
只读 `post_cover`，完全不碰 image 引用与 `*_image_id`：无数据库变更，不跑 `sync-schema.js` / `migrate-image-ref.js`。后台专栏排序页复用 `columnPostItem()`，多一个字段是纯增量。

### 验证步骤
1. 后端 nodemon 自动重载后，`GET /api/columns/1` 的 `posts[0]` 必须出现 `cover` 键（当前该文章 cover 为 null，只能验证字段已接线）。
2. `node -e "require('module-alias/register'); const {columnPostItem, prevNextVO} = require('@vo/column.vo'); …"` 用带 `post_cover` 的假对象直调 VO，验证非空值能正确映射（当前本地库没有"带封面且在专栏里"的文章，这是唯一能覆盖非空路径的只读手段）。
3. `cd frontend/home && npm run check && npm run build`（类型改动按惯例过门槛）。
4. 真机看效果需要一步数据操作：本地专栏「nxd」里只有 post 7（cover 为 null），带封面的 post 6/5 都不在任何专栏。要眼见为实需在后台把 post 6 加入专栏——这属于改你的数据，需要你点头或你自己点一下。

### 上线
`git pull` → `pm2 restart blog-server`（后端改动）。前端只有类型变化、不产物，但按惯例会跑 build；若要一并部署前端则 `cd frontend/home && npm install && npm run build && pm2 restart blog-web`。无 DB 变更。