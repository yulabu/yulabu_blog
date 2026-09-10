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
- 图片统一落 uploads/，saveImageFile 转 webp + thumb；frontend/home/public/ 静态资源（og-image.jpg 等）随 vite build 进 dist/；缩略图 *.thumb.webp 前端未消费（勿新增依赖它）
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
- **LXGW 文楷字体自托管**：npm 依赖 lxgw-wenkai-webfont（1.7.0），main.css 顶部 @import 其 style.css，woff2 子集随构建进 dist/_astro（582 个文件、_astro 共 38M，浏览器按 unicode-range 按需加载）；Layout 无 cdn.jsdelivr.net 字体外链——**站点第三方域名请求 = 0**（Edge Tracking Prevention/国内 jsdelivr 不稳双收益）。控制台最后的 [Intervention]/message channel 报错为浏览器/扩展自身行为，任何站点无法消除
- 依赖：astro/@astrojs/vue/@astrojs/node + devDeps @astrojs/check；vue-router/vite/vue-tsc 已移除；md-editor-v3 的 MdPreview 已验证可在 Node SSR 渲染（含代码高亮）
- dev 工作流：根目录 npm run dev:home = server(3000) + astro dev(5174，vite proxy /api、/uploads)；本地验证 SSR 用 `node dist/server/entry.mjs`（standalone，不自动读 .env，API_BASE_URL 走 pm2 env 注入）
- 死代码：src/_archive/（MapView 世界地图，未接线；tsconfig/依赖扫描已排除，不参与构建）；加载遮罩 TopProgressBar/LoadingOverlay 与 src/router、src/main.ts、src/App.vue 已删除（文章过渡卡片接棒加载体验）

