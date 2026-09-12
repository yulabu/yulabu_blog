## 施工约定
- ！！！重要！！！任何需要修改代码的改动，需要用户发送确认开工之后才能进行
- 方案初步设计时，遵循现有项目结构和风格，设计对应方案
- 迭代更新时，需考虑对目前部署到生产环境数据库的影响
- 写前端的时候要尽可能按照项目惯例，复用原有的组件，不要给项目增添复杂度
## Yulabu Blog 生产部署环境
服务器
项	值
系统	Debian 12 (bookworm)，xanmod 内核 6.12.67
IP	206.237.13.114（境外，免备案）
登录	SSH root
域名
域名	用途	解析
yulabu.cn + www.yulabu.cn	博客前台（对外展示）	A → 206.237.13.114
blog.yulabu.cn	博客前台（OG 分享 / 友链自抓取专用）	A → 206.237.13.114
admin.yulabu.cn	管理后台	A → 206.237.13.114
软件栈
Node.js 22.23.2（NodeSource 源）/ npm 10.9.8
Astro 7.3.2（前台 blog-web，@astrojs/vue + @astrojs/node standalone，监听 127.0.0.1:4321）
MariaDB 10.11.18（Debian 包，替代 MySQL，与 mysql2 兼容）
Nginx 1.22.1（静态托管 + 反向代理）
PM2 5.x（守护后端 blog-server 与前台 blog-web，systemd 开机自启 pm2-root.service）
certbot 2.1.0（Let's Encrypt，certbot.timer 自动续期，证书有效期至 2026-11-15）
目录结构
/var/www/yulabu_blog/
├── server/                # Express 5 后端，监听 127.0.0.1:3000
│   ├── app.js             # PM2 入口 (name: blog-server)，已设 trust proxy 'loopback'
│   ├── .env               # 环境变量（数据库/密钥/上传目录/seed）
│   ├── seed.js            # 管理员创建（读 .env 的 SEED_ADMIN_*）
│   └── scripts/
│       ├── sync-schema.js      # 幂等结构同步（补齐 sync() 不做的 ALTER）
│       └── migrate-image-ref.js # 图片引用一次性迁移（幂等；新环境/漂移时可重跑）
├── frontend/
│   ├── home/              # 主站：Astro 7 群岛架构（2026-09 重构，见开发惯例第 10 节）
│   │   └── dist/          # client/（静态预渲染页 + /_astro 哈希资源）+ server/entry.mjs（SSR 入口）
│   └── admin/dist/        # 后台静态产物（admin.yulabu.cn）
└── uploads/               # 文章/友链图片（UPLOAD_DIR=/var/www/yulabu_blog/uploads）
数据库
库：blog（utf8mb4）
账号：blog_user@localhost（仅本机，bind-address=127.0.0.1）
表由后端启动时 sequelize.sync() 自动创建；结构变更靠 sync-schema.js
Nginx
站点文件：/etc/nginx/sites-available/yulabu 与 yulabu-admin（已软链到 sites-enabled）
yulabu 站点 server_name 须含 yulabu.cn www.yulabu.cn blog.yulabu.cn，root 指 frontend/home/dist/client
前台路由：try_files $uri $uri/ @ssr → 未命中反代 127.0.0.1:4321（blog-web SSR）；/_astro/ 强缓存 1y immutable；旧 SPA 的 try_files /index.html 兜底已废弃（会吞掉 SSR 路由）
两站均：/api/、/uploads/ 反代 127.0.0.1:3000；gzip；HTTPS 由 certbot 自动改写，HTTP 重定向到 HTTPS
完整 nginx/pm2 配置与回滚步骤见 deploy/astro.md
常用维护命令
# 更新代码并重启
cd /var/www/yulabu_blog && git pull
cd frontend/home && npm install && npm run build   # 前台有变更时；SSR 包变更后需 pm2 restart blog-web
cd frontend/admin && npm install && npm run build  # 后台有变更时
cd server && npm install                            # 后端新增依赖时（如 icojs）
pm2 restart blog-server                            # 后端有变更时
pm2 restart blog-web                               # 前台 SSR 有变更时

# 改 Nginx 后
sudo nginx -t && sudo systemctl reload nginx
# 结构漂移补齐（新增列 / ENUM 值，幂等可重复执行）
cd /var/www/yulabu_blog/server && node scripts/sync-schema.js
# 验证对外 OG / 友链抓图链路
curl -s https://blog.yulabu.cn/ | grep -o 'og:image'
curl -I https://blog.yulabu.cn/og-image.jpg
pm2 logs blog-server --err                         # 抓图/限流类错误看这里
# 证书续期（已配置定时任务，一般无需手动）
certbot renew --dry-run
注意事项
- 服务器预装 xanmod 内核，其 apt 源 deb.xanmod.org 已失效（404），已在 /etc/apt/sources.list.d/xanmod-kernel.list 中注释；若 apt update 报错请检查该源
- Node 22 必须用 NodeSource 安装；若 apt 源异常，会静默装成 Debian 自带 Node 18（缺 npm），导致前端构建失败（engines 要求 ^22.18.0）
- Debian 12 无 mysql-server 包，数据库用 mariadb-server（与 mysql2 兼容）
- 数据库连接必须用 blog_user@localhost；MariaDB 的 root 默认走 unix_socket 认证，无法用密码登录
- git pull 前若 package-lock.json 等有本地改动，先 git checkout -- 再 pull，否则被拒（实踩）
- 后端新增依赖（如 icojs）必须 cd server && npm install 再 pm2 restart（实踩）
- sequelize.sync() 不做 ALTER：新增列 / ENUM 值靠 node scripts/sync-schema.js（幂等，可重复跑）；ENUM 新值必须放末尾（MySQL 按索引存储，插中间会错位，见 models/Post.js:40）（实踩 post_cover 列缺失、post_status 缺 draft）
- app.js 已设 trust proxy 'loopback'（express-rate-limit 8.x 必需，否则抛 ERR_ERL_UNEXPECTED_X_FORWARDED_FOR）（实踩）
- 对外 OG 与友链自抓取统一用 blog.yulabu.cn：服务器本机 yulabu.cn 解析失败（hairpin/DNS），blog 子域终端验证可通；站点级 OG 标签在 frontend/home/src/layouts/Layout.astro，改后必须重 npm run build（home）；文章/专栏详情页的 og 标签由 SSR 按数据实时生成，发新文章无需构建
- blog.yulabu.cn 须出现在 Nginx server_name 且指向 frontend/home/dist，部署前确认（曾不确定是否配置）
- 必须使用项目 engines 指定的 Node LTS（^22.18.0 或 >=24.12.0），生产服务器为 Node 22.23.2 / npm 10.9.8；Windows 本地若用 Node 25（奇数版）/ npm 11，peer dependency 解析会异常，导致 `@vue/devtools-api`、echarts 等包缺包，前端报 `Failed to resolve import`（实踩）。解决：本地切到 Node 22/24 LTS，或在 package.json dependencies 显式补齐 peer dep
- 初始管理员账号密码来自 server/.env 的 SEED_ADMIN_NAME/PASSWORD，上线后应已修改
- 部署文档已固化在仓库 deploy/（backup.md 异机迁移与恢复、astro.md 前台 Astro 部署/回滚）

## 开发惯例
### 1. 部署流程
- 改动须先提交 git，服务器拉取：cd /var/www/yulabu_blog && git pull
- 前端变更：cd frontend/home && npm install && npm run build（前台，SSR 变更后 pm2 restart blog-web）/ cd frontend/admin && npm install && npm run build（后台）
- 后端依赖变动：cd server && npm install；之后 pm2 restart blog-server
- Nginx 变更：nginx -t && systemctl reload nginx
- 本地改动先 npm run build + npm run check（astro check）验证再提交；home 为 Astro 产物后 vue-tsc 不再适用
- 服务器 1G 内存，禁用无头浏览器截图（puppeteer/playwright 等）

### 2. 数据库迁移
- sequelize.sync() 仅建表（表不存在时），不会 ALTER 已有表 / 追加 ENUM 值
- 新增字段或 ENUM 值必须手动 ALTER，或跑 server/scripts/sync-schema.js（幂等、可重复执行）；涉及图片引用结构的变更还需跑 migrate-image-ref.js（见第 4 节）
- 上线前自查：新模型字段 / 新 ENUM 值是否已在生产库存在
- ENUM 追加新值必须放末尾（MySQL 按索引存储，插前面会让存量数据错位，见 models/Post.js:40）
- 连接用 blog_user@localhost（utf8mb4）；root 走 unix_socket，不可密码登录

### 3. 域名与对外链接
- 对外分享 / 友链自抓取统一用 blog.yulabu.cn：服务器本机 yulabu.cn 解析失败（hairpin/DNS 问题），blog 子域终端验证可通
- 站点级 og:url / og:image 在 frontend/home/src/layouts/Layout.astro（site 配置在 astro.config.mjs），必须指向可抓的有效域名（blog 子域）
- 改 OG 标签后必须重 npm run build（home）；文章/专栏详情页 og 标签由 SSR 实时生成（post/[id].astro、columns/[id].astro），发新文章无需构建

### 4. 图片系统（2026-09 重构：引用归业务表，image 只存元数据）
- image 表仅存 storage_path / thumb_path / file_size / orphan_since，**无引用语义**；引用由业务表持 image_id：
  - 1:1 单列：post.cover_image_id、blog_column.cover_image_id、diary.cover_image_id
  - 1:N 关联表：post_image(post_id, image_id)，仅文章正文图使用
- 双层语义：业务表里的 URL（post_cover / diary.images / 正文内嵌）是输入真相源；*_image_id 是保存时由 URL 派生的引用指针（utils/image.js 的 resolveImageIdByUrl / syncPostImages 全量 replace），仅供 GC 对账。API 契约全是 URL，前端无感知，DB 内部才用 id
- URL→key 派生统一走 utils/image.js 的 storageKeyFromUrl（唯一入口，勿另写副本）：兼容相对路径 / 本站绝对域名 / 协议相对 //host / markdown title 后缀 / &amp; 实体，query、hash 丢弃；不校验 host（任意域名接受，storage_path 精确匹配把关）。派生失败只会在保存时以 console.warn（[image-ref]）暴露——"图显示着却被 GC 删"类问题先查这里
- diary 为单图契约：DTO 拒绝 images 超过 1 张（400），images[0] ↔ cover_image_id 一一对应；存量多图由 migrate-image-ref.js 截断
- GC（utils/gc.js 的 ORPHAN_RECONCILE_SQL）：LEFT JOIN 各业务表判定引用，三态处理——有引用清 orphan_since（复活）/ 无引用打标 / 标记超 24h（ORPHAN_GRACE_MS）**且文件创建超 72h（ORPHAN_MIN_AGE_MS）** 才删文件+记录。服务启动时 + 每 24h 跑
- 删除文章/专栏/日记/友链**不再即时删图**：引用随行消失，物理文件由 GC 延迟回收；后台图片库会短暂出现无主图，属正常
- 新增持图业务的标准步骤（缺③④会把在用图误判为孤儿）：① 业务表加 *_image_id 列（1:1）或建关联表（1:N）→ ② 保存逻辑派生 image_id → ③ gc.js 对账 SQL 加一行 LEFT JOIN + IS NULL 判断 → ④ imageController 的 findReferencedImageIds / attachReferences 加同类型分支
- 旧 image.reference_type / reference_id 列已废弃但保留库中未删（回滚保障），代码禁止再读写；稳定后可 DROP。勿再往 image 表加业务语义/枚举
- 友链图片**彻底外链化、完全退出图片系统**（2026-09 v2）：avatar（头像）/ preview_image（背景图）双外链字段，DTO 共用白名单——只收 http(s):// 或 //（拒绝 /uploads/，无指针的本站路径会被 GC 误删）；「抓图」= ogImage.js 的 fetchOgMeta：og:image→背景图覆盖写、favicon（apple-touch-icon 优先）→头像仅空时填（手填不覆盖，清空后可重抓）；不下载不落盘无 image 记录。preview_image_id 已从模型移除（列留库待 DROP，代码禁止读写），GC 对账 SQL 与 imageController 的 friend_link 分支已删除——只被友链引用过的图会被 GC 正常回收。存量本地留存图由 migrate-image-ref.js 清空，部署后到后台逐条重新「抓图」恢复
- 图片统一落 uploads/，saveImageFile 转 webp + thumb；frontend/home/public/ 静态资源（og-image.jpg 等）随 vite build 进 dist/；缩略图 *.thumb.webp 只被**首页文章列表的小卡封面**消费（列表接口的 `post.coverThumb`，见 server/models/index.js 的 `Post→Image` 关联 + server/vo/post.vo.js）——大图卡、文章页与过渡卡片仍用 `post_cover` 原图，勿把它当通用缩略图用（移动端实测：小卡显示 112–182px，400px 缩略图在 2x/3x 屏都够清晰）
- 涉及图片结构变更的部署顺序：sync-schema.js → migrate-image-ref.js（均幂等，迁移以 URL 匹配为准、不盲信旧 reference_id）→ pm2 restart

### 5. 后端代码约定
- 校验集中在 server/dto/*.dto.js（白名单过滤）；异常用 server/middleware/AppError.js 抛 400/404
- 响应统一经 server/vo/*.vo.js 组装（相对路径补 /uploads/ 前缀等）
- /api/admin/* 受 auth 中间件保护
- app.js 已设 trust proxy 'loopback'（express-rate-limit 8.x 必需，否则报 ERR_ERL_UNEXPECTED_X_FORWARDED_FOR）
- 分层：routes/*Routes.js → controllers/*Controller.js → models/* + dto/* + vo/*

### 6. 前端代码约定
- 复用既有组件，不引入新依赖/复杂度
- 列表/编辑页三态状态机：文章 draft / published / trash；编辑页按 currentStatus 分流按钮，trash 只读
- 列表返回保留 tab：列表 activeTab ↔ route.query.status 双向同步
- 加载体验：admin 登录页预加载遮罩；home 的加载体验见第 10 节（文章过渡卡片）
- API 调用统一走 src/api/*，异步动作包 useAsyncAction

### 7. 本地环境坑
- PowerShell/bash 中 $Code 须反引号转义：E:\`$Code\...，否则路径展开为空
- 本地 Node fetch 走不了代理，github.com / yulabu.cn 等本地 fetch failed 属正常，生产服务器直连正常
- Node 22 必须 NodeSource；Debian 自带 Node 18 缺 npm 会构建失败
- 本地 Windows 务必使用 Node 22/24 LTS（项目 engines 要求 ^22.18.0 或 >=24.12.0）。Node 25（奇数版）/ npm 11 会导致 peer dependency 解析异常，拉取最新代码后前端报 `Failed to resolve import`（实踩 `@vue/devtools-api`、`echarts/core` 缺包）。解决：① 切到 Node 22/24 LTS；② 或在 package.json dependencies 显式补齐 peer dep；③ 或删 `node_modules` + `package-lock.json` 重 `npm install`
- package-lock.json 与 package.json 不同步会导致 npm ci 失败，用 npm install 重生成后提交 lock

### 8. 验证方式
- 后端 DTO 可直接：node -e "require('module-alias/register'); require('dotenv').config(); const {...}=require('@dto/...')" 验证
- home 以 npm run build 通过 + npm run check（astro check）0 error 为门槛；admin 仍以 npm run build（含 vue-tsc）为门槛
- SSR 链路验证：本地起 server（npm run dev）后 `curl -s localhost:4321/post/<id> | grep -E 'og:title|og:image'`
- 业务改动建议生产实跑：curl -I https://blog.yulabu.cn/og-image.jpg、pm2 logs --err

### 9. 备份系统（2026-09）
- 结构：cron（/etc/cron.d/blog-backup，每天 04:00）→ server/scripts/backup.js（CLI 壳）→ server/utils/backup.js（核心，controller 共用）；产物在 <仓库根>/backups/（db/ 存 dump 保留 BACKUP_KEEP=30 份，uploads/ 为 rsync 镜像，排除 .tmp）；配置在 server/config/backup.js，git 已忽略 /backups
- dump 命令自动探测：mariadb-dump（生产）→ mysqldump（macOS brew）；凭据经临时 defaults-extra-file（chmod 600）传入，MySQL 系 dump 追加 --set-gtid-purged=OFF（向启用 GTID 的库导入会报错，实踩）；产物 <1KB 视为失败删除
- 后台「备份管理」页（/admin/backups）：列表 / 立即备份 / 导出完整包 / 删除 dump；接口挂在 adminRoutes.js（GET·POST /admin/backups、GET /admin/backups/:filename/export 流式下载、DELETE）；文件名白名单 ^blog-\d{8}-\d{6}\.sql\.gz$ 防路径穿越；备份与导出经 backups/.lock 文件锁跨进程互斥（wx 原子创建，PID+时间戳，重复触发 409，残留超 30 分钟自动接管；cron 与 pm2 是两个进程，模块级变量防不住跨进程，实改为文件锁）
- 导出包 = dump + 最新 uploads 镜像 + restore.sh（MYSQL_PWD 传密码，空密码不退化成交互提示，实踩）+ README-恢复说明.txt；**不含 server/.env**（迁移单独 scp）；打包前检查磁盘剩余空间（不足 507）
- 前端下载用 http.get<Blob> + responseType:'blob' + timeout:0（http.ts 全局 15s 超时会掐断备份/导出，实踩）；http.ts 响应拦截器已支持解析 blob 错误体中的 JSON message
- 恢复/迁移完整步骤见 deploy/backup.md（含异机迁移 checklist 与 cron 内容）；本地开发无 uploads 目录时镜像步骤告警跳过

### 10. 前台 Astro 群岛架构（2026-09 重构，home 由 Vue SPA 迁移）
- 渲染分工：6 个列表页（/ /archive /about /friends /columns /diary）构建时静态预渲染；/post/[id]、/columns/[id]、/404 走 SSR（页面内 `export const prerender = false`）。发新文章无需构建，文章页实时 SSR 出完整 HTML（正文 + per-post og 标签）
- 结构：src/pages/*.astro 即路由（无 vue-router）；src/layouts/Layout.astro 承接全局 head（OG/字体/主题内联脚本/ClientRouter）与常驻岛（Navbar / MessageBox / MusicPlayer）；Vue 组件在 src/views、src/components 原样复用，以 client:* 指令挂岛
- 数据流不变：axios（src/utils/http.ts，baseURL /api）客户端取数；SSR 页由页面 frontmatter 用 process.env.API_BASE_URL（默认 127.0.0.1:3000/api）服务端取数后经 props 注入岛，岛内 `if (!props.initialXxx)` 才回退自行拉取
- 跨岛状态：pinia 经 @astrojs/vue 的 appEntrypoint（src/pages/_app.ts）注入每个岛，但**各岛是独立 app 实例、store 互不同步**——主题靠 CSS 变量（setTheme 写 documentElement）天然全局生效；首页 Hero 折叠态经自定义事件 yulabu:hero-collapsed 同步给 Navbar；音乐播放器靠 transition:persist 跨页存活（persist 挂在普通 div 包装上，勿直接挂 astro-island，会触发 swap 的 moveBefore 边界 bug，实踩）
- 图标全部离线：AppIcon.vue（同步渲染 getIcon body，SSR/客户端输出一致、零 pop-in）替代 @iconify/vue 的 Icon 组件（其 Icon 走异步 watcher，SSR 首帧只有占位 svg，且运行时拉 api.iconify.design 会触发 Edge Tracking Prevention 刷屏）。图标子集由 scripts/build-icons.mjs 生成 src/assets/icons.json（@iconify-json/material-symbols + @iconify-json/mdi 抽取，新增图标先在脚本 ICONS 清单登记再 npm run icons）；勿在模板直接用 @iconify/vue 的 Icon
- 水合稳态纪律：岛内任何「客户端专属状态」（URL query、sessionStorage、主题、matchMedia）一律不给 SSR 期首帧用——setup 期初值与 SSR 保持一致，onMounted 里再同步真实值（Navbar 的 searchInput/heroCollapsed/themeIcon、HomeView 的 searchQuery、PostDetail 的 mdTheme 皆如此，实踩 Navbar 根级 v-if mismatch）；根级 v-if 的岛组件是 mismatch 高危形态，新增岛时避免；日期统一按北京时间取部件（utils/date.ts 的 beijingShifted，消除服务器 UTC 与访客本地时区的文本差）
- 文章过渡卡片（点列表/上下篇进文章时弹封面+标题+摘要，2 秒后淡出）：信号走 window.__yulabuSplashId（utils/postSplash.ts 的 markPostSplash 写入；勿改用 sessionStorage——ClientRouter 重建脚本场景下读取不可靠，实踩）；卡片是 post/[id].astro 里 SSR 预印的隐藏模板（默认 opacity 0 + pointer-events none，无 JS/直接访问/爬虫完全无感），内联脚本 data-astro-rerun 消费信号后显示，SPLASH_DWELL_MS=2000 可调；脚本必须幂等（重复执行不得移除已展示卡片，实踩）
- Astro 7 实踩坑：astro.config.mjs 必须静态对象导出——.mjs 配置加载器不求值函数式 defineConfig，adapter/integrations 会整个丢失；pinia 需 src/pages/_vue-flags.ts 先于 pinia 导入挂 __VUE_PROD_DEVTOOLS__ 等全局（external 加载时未 define 会 ReferenceError）；MessageBox 根节点是 Teleport to body，必须 client:only（SSR 水合会在 body 触发 mismatch 清理误删相邻岛，实踩删过 Navbar）；凡依赖 window/localStorage/Audio 的代码在岛内要守卫（stores/ui.ts 用 typeof window 判定，MusicPlayer 整岛 client:only）；ClientRouter 软导航后内联脚本需 data-astro-rerun 才重跑，全局监听挂 astro:page-load / astro:after-swap
- 首页全屏 Hero 的折叠态防弹跳：老访客（sessionStorage homeHeroCollapsed=true）进入首页必须首帧即折叠布局——Layout 内联脚本首帧前给 html 打 data-hero-collapsed（与 data-theme 同一 applyClientState 脚本、after-swap 重挂），HomeHero 用 `:global(html[data-hero-collapsed] .home-hero …)` 全量镜像折叠样式（height/content padding/标题字号/波浪/scroll-hint）。**Vue scoped 对「:global() + 后代 + :deep()」混用会丢弃后代部分**（实测规则塌缩成只匹配 html），必须把整个选择器包进一个 :global()（实踩）
- **SSR 岛内禁止裸 `<Teleport to="body">`**：弹层关闭态 SSR 仍输出 teleport 注释标记，与 Astro 向岛内注入的水合脚本错位 → 每次进入必报 hydrateTeleport mismatch（实踩 DiaryView 灯箱、AboutNode 弹出层）。修法：Teleport 加 `v-if="isMounted"` 守卫（挂载后才挂，弹层本就只在交互后出现）；MessageBox/PostSplash 这类纯弹层走整岛 client:only。现有 Teleport 均已守卫，新增弹层时沿用此纪律
- 文章过渡卡片：**常驻遮罩岛 PostSplash.vue**（client:only + 外包 div transition:persist，与 MusicPlayer 同模式）——点击文章瞬间在当前页弹出（数据取自被点击条目：markPostSplash(post) 挂 window.__yulabuSplash + 广播 yulabu:post-splash 事件，四个调用点：列表/归档/专栏目录/上下篇），文章 SSR 在卡片背后加载；astro:after-swap 时 URL 匹配才从点击起算满 2s（SPLASH_DWELL_MS）淡出，SSR 慢则显示到加载完（SPLASH_MAX_MS=6s 兜底），中途改点其他页立即隐藏。post/[id].astro 不再烘焙卡片（无 JS/直接访问/爬虫/分享链接无事件，卡片永不出现）。勿用 sessionStorage 传卡信号（ClientRouter 重建脚本场景不可靠，实踩）；persist 勿直接挂 astro-island（moveBefore 边界 bug，实踩）
- md-editor-v3 扩展全本地化（utils/mdEditorSetup.ts，_app.ts 与 Layout 双侧引入）：config() 注入本地 highlight.js/lib/common 实例 + 本地主题 css（highlight.js/styles/*.css?url），MdPreview 加 no-katex/no-mermaid/no-echarts——**根除 unpkg.com 运行时外链**（该域被 Edge 列入跟踪器名单，每次整页加载文章注入 7 个外链触发 Tracking Prevention 刷屏）；服务端与客户端同一实例保证 SSR 代码块高亮与水合一致；vite.optimizeDeps.include: ['md-editor-v3'] 固化预包（dev 重启后旧 hash 504 Outdated Optimize Dep 的减发措施，dev 专属现象）
- **LXGW 文楷字体自托管，桌面与移动统一**：npm 依赖 lxgw-wenkai-webfont（1.7.0），**只引 regular + bold 两档**（`lxgwwenkai-regular.css` / `lxgwwenkai-bold.css`）—— 这是唯一"用不上"的部分：Mono 三档与 Light 一档经全站 grep 确认零引用（582 条 @font-face → 194 条，字体 CSS 565 KB → 183 KB）。以 `?url` 导入后由 `Layout.astro` 用 `<link rel="stylesheet" media="print" onload="…">` 非阻塞引入；**不能写回 main.css 的 `@import`**：那样会与全局样式合并成一个渲染阻塞样式表（实测 565 KB / gzip 217 KB，占首屏阻塞资源 223 KiB 中的 212 KiB）。woff2 子集 194 个 / 约 9.2 MB 随构建进 `dist/_astro`，浏览器按 unicode-range 按需加载。**不要再按视口砍字体**：曾试过移动端不加载，实测首页可省 590 KB、archive 可省 1,007 KB，但桌面/移动观感会不一致，已被否决
- **隐藏容器里的资源与岛都要能被"不加载"**：`<img>` 加 `loading="lazy"`（懒加载图在 `display:none` 子树里永不与视口相交 → 永不请求；桌面端在首屏内仍立即加载）、Astro 岛用 `client:visible`（容器被 CSS 永久隐藏 → IntersectionObserver 永不触发 → 不下发该岛的 JS、不水合）。**约定：给 `client:visible` 的岛，其容器若改回可见必须同步把指令改回 `client:load`**（否则该岛在窄屏静默失效）。当前用例：`HomeHero`、`PageFrame` 的 `WelcomeBanner`（≤768px 隐藏）、首页左栏 `TagBox`（≤1024px 隐藏，顺带消掉它那次重复的 `/api/tags`）
- Layout 无 cdn.jsdelivr.net 字体外链——**站点第三方域名请求 = 0**（Edge Tracking Prevention/国内 jsdelivr 不稳双收益）。控制台最后的 [Intervention]/message channel 报错为浏览器/扩展自身行为，任何站点无法消除
- 依赖：astro/@astrojs/vue/@astrojs/node + devDeps @astrojs/check；vue-router/vite/vue-tsc 已移除；md-editor-v3 的 MdPreview 已验证可在 Node SSR 渲染（含代码高亮）
- dev 工作流：根目录 npm run dev:home = server(3000) + astro dev(5174，vite proxy /api、/uploads)；本地验证 SSR 用 `node dist/server/entry.mjs`（standalone，不自动读 .env，API_BASE_URL 走 pm2 env 注入）
- 死代码：src/_archive/（MapView 世界地图，未接线；tsconfig/依赖扫描已排除，不参与构建）；加载遮罩 TopProgressBar/LoadingOverlay 与 src/router、src/main.ts、src/App.vue 已删除（文章过渡卡片接棒加载体验）

- **跨页常驻岛：个人卡片（2026-09）**——**首页 / 归档 / 日记**三页左栏是同一个 DOM 节点，三页之间来回切换零重建、位置不动（实测 absTop 388 / left 84 / 300×330 全程一致，且节点上的 JS 属性仍在）。
  - **`transition:persist` 只在 `.astro` 模板里生效**：Astro 编译期把它改写成 `data-astro-transition-persist`，ClientRouter 才认；写在 Vue SFC 里只是原样透传一个属性。所以卡片必须由 Astro 渲染 → 新增 `src/components/astro/PageFrame.astro` 作为页面骨架（全宽刊头槽 + 左栏 rail + 主内容 main），首页与归档页都用它，两页的 persist key 必须同名（`personal-card`）。persist 挂在普通 div 上，不要直接挂 astro-island（moveBefore 边界 bug）
  - 骨架左栏 ≤1024px 隐藏（沿用原首页左栏约定）；归档页与日记页左栏除卡片不放别的（rail 槽留空），首页 rail 槽放 TagBox
  - `HomeView.vue` / `ArchiveView.vue` / `DiaryView.vue` 已退化为纯内容（HomeView 只留中心列 + 右栏；DiaryView 只留 720px 正文）；其余 5 个视图（About / Columns / ColumnDetail / Friends / PostDetail）仍用 `SitePageFrame.vue`，未迁移
  - 音乐播放器（MusicPlayer）的**完全展开白名单**是 `EXPAND_PATHS = ['/', '/diary']`：桌面端在这两页展开成完整面板，其余页面是迷你条；移动端 ≤768px 一律迷你条。它靠 `transition:persist` 跨页存活，所以这里只改「在哪几页展开」，播放状态不受影响
  - **slot 属性不能直接挂在 Vue 岛组件上**：Astro 传给框架组件的 slot 会作为 fallthrough 属性进入 Vue，而服务端渲染时 Astro 不输出该属性 → 水合属性不匹配告警（实测首页 banner/rail 两处）。要包一层普通元素：`<div slot="rail"><TagBox client:load /></div>`
- **标签筛选的跨岛共享状态（stores/tagFilter.ts）**：TagBox 现在挂在骨架左栏、PostList 在中栏，二者分属不同岛，Astro 传给岛的 props 又是静态的，所以用**模块级 ref**（同一份 ESM 模块图，同页所有岛共享同一实例）。**不要用 pinia**——每个岛是独立 app 实例、store 各注一份互不同步；也不要绕 DOM 事件，模块单例更简单。新增跨岛共享状态时沿用这个模式
- **预渲染页在构建期烘焙真实内容**：5 个列表页 frontmatter 顶层 await `src/utils/serverData.ts` 取数并经 props 注入岛，产物 HTML 里就是真实文章/标签/专栏/日记/友链（首屏不再先闪「加载中」空壳，爬虫/分享可读）
  - **必须 fail-soft**：取数失败一律返回空值、绝不拦构建（实测死后端仍构建成功，各页打印 `[serverData]` 告警并退化为客户端取数）。代价：**构建时需后端可达**才能烘焙出内容
  - **烘焙切片必须与客户端对账切片一致**（/posts 用 `limit`、/diaries 用 `pageSize`；PostList 的 PAGE_SIZE 与 index.astro 的 fetchPosts 必须同值），否则指纹永不相等 → 每次访问无谓重绘
  - 岛内用 `src/utils/liveData.ts` 的 `createSilentSync`：指纹一致则**完全不动 DOM（零闪烁）**，不一致才替换，取数失败静默吞掉 → 保住「发新文章无需构建」
  - **Astro 对 JS Vue SFC 的 props 推断很粗**：`type: Array/Object` 被当成必填 `unknown[]`/`Record<string,any>`，且**函数式 default（`default: () => []`）会让 .vue 类型生成整个失败**（报 `Module has no default export`）。所以烘焙型 props 一律不写 default、由页面必定传入、组件内 `props.x || []` 兜底；也不要传 `null`（类型不接受），失败就传空数组/空对象
- **页脚（SiteFooter.astro，纯 Astro 零 JS）**：只有站点名 + GitHub/Email + 版权，**刻意不放导航链接**（导航已在 Navbar）。两个坑：① **必须自带不透明底色**（`background-color: var(--bg-page)` + 玻璃渐变）——本项目 body 没有背景色，页面底色由 .page-frame 这类容器提供，而页脚在它们之外，只给半透明底会透出浏览器画布（白），暗色模式下底部漏浅色带且文字只有 2.9:1（实测）；② 文字用 `--color-heading` / `--color-text`，不要用 `--color-primary`（白玻璃底上仅 3.2:1，16px 不达 AA）

### 11. 访问统计（visit_log + daily_stat，2026-09）
- 分工：`visit_log` 只存原始明细（公开写入 + 后台分页列表 + 今日实时统计 + GC），保留 90 个**完整自然日**；`daily_stat` 存每日聚合（stat_date 主键 + pv + uv，一天一行，**永久保留**）。工作台折线图的 visitsByDate 与访问日志页「总浏览量/总独立访客」只读 daily_stat；「今日 PV/UV」实时读 visit_log（今日窗口永远在保留期内，无丢失风险）
- 聚合：`utils/dailyStat.js` 的 aggregateDailyStats 全量重算（`SELECT DATE(created_at) … GROUP BY DATE(created_at)` → `bulkCreate(updateOnDuplicate:['pv','uv'])`，幂等自愈），`app.js` 启动跑一次（自动回填日志中尚存的近 90 天）+ 每 10 分钟一次；24h 的 visitGc 任务**先聚合再清理**，聚合失败则跳过本次清理。CLI：`cd server && node utils/dailyStat.js`
- **三条勿破坏的不变式**：① 聚合只 UPSERT 日志中仍存在的日期，**绝不写 0 行、绝不删除 daily_stat 行**——日志里没有的日期（已过保留期）不在分组结果里，历史行因此安全；别为了「补齐空白天」预生成 0 行，那会让这条保证失效 ② visitGc 的 cutoff 必须按北京自然日对齐（`beijingDayStart(shiftDateStr(beijingDateStr(), -(RETENTION_DAYS - 1)))`）：用「now-90d」时间戳截断会把最老一天切成半截，重算时用半截数据覆盖完整行（实修） ③ 后端判定「今天」一律走 `utils/date.js` 的 beijingDateStr / shiftDateStr / beijingDayStart，勿用 `new Date().setHours(0,0,0,0)`——库里 DATETIME 按 +08:00 存墙钟，而生产 Node 进程时区可能是 UTC，会错开 8 小时（北京时间 00:00–08:00 图表日期序列与 DB 分组差一天，实修）
- 口径（已知取舍）：totalUV = SUM(daily_stat.uv)，是各日去重后求和，长期访客会被逐日重复计入（偏大但永不缩水）；「清空访问日志」只删明细，不再重置总量，要重置历史统计须手工清 daily_stat
- 部署：纯增量新表，无数据迁移；`sequelize.sync()` 与 sync-schema.js 都会建表，启动即自动回填。首次上线只能回填日志尚存的最近 90 天，更早历史无法找回
- 前端零改动即可受益（接口字段与结构未变）；后续若要 90 天/一年窗口，后端 range 白名单已支持 90days/365days，前端加下拉项即可

### 12. 评论区（giscus，2026-09）
- 选型：giscus（评论存在 GitHub Discussions，无后端、无数据库改动）。评论仓库是**独立的公开仓库 `yulabu/Blog_Content`**（分类 `评论`，Announcements 类型），与源码仓库解耦——源码仓库哪天转私有，存量评论不受影响；仓库必须保持 public，否则评论立即不可见
- 组件 `src/components/post/GiscusComments.vue`，只挂在文章页（PostDetailView 正文卡之后）。客户端运行时注入 `client.js`——**不要在模板里写死 `<script>`**：ClientRouter 软导航后模板脚本不会重跑，评论区会静默消失；滚到评论区前 300px 才注入（没读到文末的访客零第三方请求）；`data-mapping="pathname"` 让 yulabu.cn / blog.yulabu.cn 的同一篇文章共用一条讨论帖
- 三条实踩：① giscus 把「该页面还没有讨论帖」（`Discussion not found…`）也走 `error` 字段回传，而那正是每篇新文章最正常的状态，**不能据此判失败**，只留 console.warn；② 消息要按 `event.source === 当前 iframe.contentWindow` 过滤（postMessage 是窗口级广播，软导航残留的旧 iframe 也会发到同一个监听器）；③ 主题 setConfig 必须去重，只在主题真的变化时才推
- 主题：`public/giscus-light.css` / `giscus-dark.css` 自托管，配色取自 main.css 的站点变量。**giscus 主题文件本质只是一张 Primer 变量表**（widget 的布局/字号/结构样式来自 giscus 应用自身），所以只改变量 + 3 条圆角规则，不依赖类名、giscus 升级不会失效
- **主题 CSS 必须由服务端返回 CORS 头**（giscus 用 `<link crossorigin="anonymous">` 加载它），nginx 配置见 deploy/astro.md 第三节；缺了不会报错，只会静默变成无主题（页面正常、只是没配色），排查：`curl -sI -H "Origin: https://giscus.app" https://yulabu.cn/giscus-light.css | grep -i access-control`
- **本地 dev 看不到自托管主题**：dev 是 `http://localhost`，而 https 的 giscus.app iframe 加载 http 样式表会被浏览器按混合内容整份拦掉（实测：样式表进了 `document.styleSheets`，但一条规则都不生效），所以组件在 `location.protocol !== 'https:'` 时退回内置 `noborder_light` / `noborder_dark`。要预览配色改动，把 CSS 以 `<style>` 注入 https://giscus.app/zh-CN/widget 页（同源）并模拟卡片底色
- 目前只有文章页有评论；要给日记/专栏页开，把同一个组件放进对应视图即可（pathname 映射会自动各成一条帖）
- **评论区总开关**：后台「系统设置」页（`/admin/settings`）——关掉后文章页不再渲染评论区。设置存在 `setting` 表（key/value），键定义集中在 `server/config/settings.js`：**新增设置项只加一行 + dto 白名单**，不需要改表结构、不需要给老库补数据（缺行即用 default）。读走公开的 `GET /api/settings`（只吐 public 键），写走 `PUT /api/admin/settings`（登录态 + 白名单 + 类型校验，未知键/非布尔值一律 400）
- 开关生效链路：`post/[id].astro` SSR 时取 `/api/settings`，把 `commentsEnabled` 经 props 注入 `PostDetailView`，为 false 时整个评论区不渲染（岛也不挂）。取不到设置接口时按**开启**处理（fail-soft，与其它取数一致）
- `setting` 表由 `sequelize.sync()` 启动时自动创建（**新表不需要 sync-schema**，那是给 ALTER 用的），且随整库 dump 进备份包——恢复备份后开关状态不丢
- giscus 的第三方请求只发生在评论区进入视口之后：`giscus.app`、`api.github.com`、`avatars.githubusercontent.com`（评论头像），以及主题里官方自带的两个 `github.com` 加载图
