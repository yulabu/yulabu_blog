## 施工约定
- ！！！重要！！！任何需要修改代码的改动，需要用户发送确认开工之后才能进行
- 代码改动后，用户没有提要求的情况下，默认不提交/推送
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
pm2 logs blog-server --err                         # 5xx / 限流命中看这里（4xx 看 nginx access log）
pm2 logs blog-server                               # 启动、GC、统计聚合、备份进度
# 日志轮转（PM2 自身没有轮转，不装会无限增长）
pm2 install pm2-logrotate && pm2 set pm2-logrotate:max_size 10M && pm2 set pm2-logrotate:retain 7
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
- 部署文档已固化在仓库 deploy/（backup.md 异机迁移与恢复、astro.md 前台 Astro 部署/回滚、schema.md 数据库结构基线与对账）

## 开发惯例
### 1. 部署流程
- **部署只走 GitHub 推送这一条路径（2026-09-30 用户要求）**：先 `git push origin main`，再在服务器 `git pull` + `pm2 restart`。不得用 bundle / scp / 手工改服务器文件等旁路把代码送上去——旁路会让 GitHub 与生产分叉，之后无法用 git 判断生产到底跑的哪一版
- 改动须先提交 git，服务器拉取：cd /var/www/yulabu_blog && git pull
- 前端变更：cd frontend/home && npm install && npm run build（前台，SSR 变更后 pm2 restart blog-web）/ cd frontend/admin && npm install && npm run build（后台）
- 后端依赖变动：cd server && npm install；之后 pm2 restart blog-server
- **后端启动策略（2026-10 起）**：启动顺序是 sync → sync-schema → 定时任务 → 最后才 listen（端口开＝可用）；任一步失败记 `[err]` 后 `exit(1)`，交 PM2 退避重启（`--exp-backoff-restart-delay=2000`，命令见 deploy/astro.md 第八节）。排查启动问题看 out 日志里的 `[err] [server] 启动失败` / `端口 … 监听失败`
- Nginx 变更：nginx -t && systemctl reload nginx
- 本地改动先 npm run build + npm run check（astro check）验证再提交；home 为 Astro 产物后 vue-tsc 不再适用
- 服务器 1G 内存，禁用无头浏览器截图（puppeteer/playwright 等）

### 2. 数据库迁移
- sequelize.sync() 仅建表（表不存在时），不会 ALTER 已有表 / 追加 ENUM 值；但**它会补齐模型里声明而库里缺失的索引**（showIndex → addIndex，对已存在的表也跑）
- **结构出处**：列 / 索引 / 外键都声明在模型里（`models/*.js` 的 `indexes`、`models/index.js` 的关联）——索引改模型 + 重启即补；**外键只在「建表那一刻」内联生成，已存在的表不会被补**（2026-09 加的 `Post.belongsTo(Image)` 这类关联在老库上不产生 ALTER）。老库与新库的外键差异用 `server/scripts/reconcile-schema.js` 对齐（幂等，**默认 dry-run**，`--apply` 才执行），基线、遗留对象与回滚 SQL 见 deploy/schema.md
- 新增字段或 ENUM 值必须手动 ALTER，或跑 server/scripts/sync-schema.js（幂等、可重复执行）；涉及图片引用结构的变更还需跑 migrate-image-ref.js（见第 4 节）。**别再往 sync-schema 里加建表语句**：sync() 总是先建表，那些分支永不执行，只会变成第二份会漂移的 DDL（2026-09-30 已删掉 visit_log 那份；daily_stat / diary / post_image 三份死分支仍在，清理牵连「新库带外键、老库不带」的基线决策，见 deploy/schema.md）
- 上线前自查：新模型字段 / 新 ENUM 值是否已在生产库存在
- ENUM 追加新值必须放末尾（MySQL 按索引存储，插前面会让存量数据错位，见 models/Post.js:40）
- 连接用 blog_user@localhost（utf8mb4）；root 走 unix_socket，不可密码登录

### 3. 域名与对外链接
- 对外分享 / 友链自抓取统一用 blog.yulabu.cn：服务器本机 yulabu.cn 解析失败（hairpin/DNS 问题），blog 子域终端验证可通
- 站点级 og:url / og:image / og:avatar 在 frontend/home/src/layouts/Layout.astro（site 配置在 astro.config.mjs），必须指向可抓的有效域名（blog 子域）；og:avatar 是社区约定扩展（2026-10-04 加），内容为 `/avatar.webp`（public/ 下与个人卡片同图的稳定地址，勿引用 /_astro 哈希产物），只是对外暴露的头像声明——我们的抓图逻辑不读它
- 改 OG 标签后必须重 npm run build（home）；文章/专栏详情页 og 标签由 SSR 实时生成（post/[id].astro、columns/[id].astro），发新文章无需构建
- 文章分享（复制链接 / 分享海报二维码）统一走 canonical origin `blog.yulabu.cn`：`post/[id].astro` 把 `Astro.site` 的 origin 作为**必填 prop（siteOrigin，不设默认值）**传入 PostDetailView → SharePanel，弹层里 `shareUrl` 是链接文本与海报二维码的唯一共同来源。海报是纯前端 Canvas 产物（`composables/useSharePoster.ts`，5:6 白底圆角卡 900×1080 逻辑尺寸 @2x 导出 PNG：封面满铺到顶 + 左下日期角标 + 标题/竖条摘要 + 头像署名 + 右侧码，固定配色不随访客主题变）：qrcode 包**只准用 `create()` 取模块矩阵自绘圆点码**（禁用其 toCanvas/toDataURL 等默认渲染器，三个定位角画圆角方块环保扫码率）；封面跨域按 `crossOrigin='anonymous'` 尝试，加载失败/超时（4s）降级「浅绿底+首字」，`toDataURL` 抛画布污染错误时自动换兜底封面重绘导出（双保险）。SharePanel 弹层只留海报预览 +「复制链接/保存海报」双按钮，自带 body 滚动锁——释放只有 `restoreBodyOverflow()` 这一个幂等实现（遮罩/ESC/关闭按钮/离场动画结束全走它），`onBeforeUnmount` 兜底调用；整弹层经 `defineAsyncComponent` 懒加载，文章页首屏 JS 零增重。复制文本统一走 `composables/useClipboard.ts` 的 `copyText`（FriendsView 同用）

### 4. 图片系统（2026-09 重构：引用归业务表，image 只存元数据）
- image 表仅存 storage_path / thumb_path / file_size / orphan_since，**无引用语义**；引用由业务表持 image_id：
  - 1:1 单列：post.cover_image_id、blog_column.cover_image_id、diary.cover_image_id
  - 1:N 关联表：post_image(post_id, image_id)，仅文章正文图使用
- 双层语义：业务表里的 URL（post_cover / diary.images / 正文内嵌）是输入真相源；*_image_id 是保存时由 URL 派生的引用指针（services/image/derive.js 的 resolveImageIdByUrl / syncPostImages 全量 replace），仅供 GC 对账。API 契约全是 URL，前端无感知，DB 内部才用 id
- URL→key 派生统一走 services/image/derive.js 的 storageKeyFromUrl（唯一入口，勿另写副本）：兼容相对路径 / 本站绝对域名 / 协议相对 //host / markdown title 后缀 / &amp; 实体，query、hash 丢弃；不校验 host（任意域名接受，storage_path 精确匹配把关）。派生失败只会在保存时以 console.warn（[image-ref]）暴露——"图显示着却被 GC 删"类问题先查这里
- diary 为单图契约：DTO 拒绝 images 超过 1 张（400），images[0] ↔ cover_image_id 一一对应；存量多图由 migrate-image-ref.js 截断
- GC（jobs/imageGc.js；对账 SQL 来自 services/image/refs.js 的 ORPHAN_RECONCILE_SQL）：LEFT JOIN 各业务表判定引用，三态处理——有引用清 orphan_since（复活）/ 无引用打标 / 标记超 24h（ORPHAN_GRACE_MS）**且文件创建超 72h（ORPHAN_MIN_AGE_MS）** 才删文件+记录。**2026-10 加写前重查**：删除阶段先取一次新鲜引用集合，快照后被重新引用的候选救回并清标记（草稿清理同样在删前重读该行）。服务启动时 + 每 24h 跑
- 删除文章/专栏/日记/友链**不再即时删图**：引用随行消失，物理文件由 GC 延迟回收；后台图片库会短暂出现无主图，属正常
- 新增持图业务的标准步骤（2026-09 收口：改前③④是两处，漏一处就把在用图误判为孤儿）：① 业务表加 *_image_id 列（1:1）或建关联表（1:N）→ ② 保存逻辑派生 image_id（services/image/derive.js）→ ③ 在 services/image/refs.js 的 REFERENCE_SOURCES 加一条（孤儿对账 SQL、后台按类型筛图、反查引用位置都从它派生）→ ④ 若是**新类型**，先在 utils/imageRefTypes.js 登记该类型名（类型名只有这一个出处；筛图的 HTTP 白名单由它派生）→ ⑤ 跑 `node scripts/check-refs.js`：引用图有三份描述（账本条 / 模型关联 / 外键基准），它做四向断言并按提示补齐（新库外键由 sync 建表时内联生成，老库要往 `FK_TARGETS` 加一行；有意缺席必须登记进该脚本的 EXCEPTIONS 并写明理由）
- 旧 image.reference_type / reference_id 列已废弃但保留库中未删（回滚保障），代码禁止再读写；稳定后可 DROP。勿再往 image 表加业务语义/枚举
- 友链图片**彻底外链化、完全退出图片系统**（2026-09 v2）：avatar（头像）/ preview_image（背景图）双外链字段，DTO 共用白名单——只收 http(s):// 或 //（拒绝 /uploads/，无指针的本站路径会被 GC 误删）；**url 字段 2026-10 起只收绝对 http(s)://**；「抓图」= services/ogImage.js 的 fetchOgMeta：og:image→背景图覆盖写、favicon（apple-touch-icon 优先）→头像仅空时填（手填不覆盖，清空后可重抓）；抓图逻辑不读 og:avatar；不下载不落盘无 image 记录。**抓图出站已加固（2026-10）**：DNS 解析出的每个地址过 `ipaddr.js` 判非公网段（含 IPv4-mapped）、`redirect:'manual'` 逐跳复检（≤3 跳）、body 上限 512KB（**到上限只停止读取、仍按已读内容解析**：实测直接抛错会把 github.com 这类大首页误伤）、只收 text/html、失败路径记 `[warn] [og-image]`——友链 URL 是管理员填的，但「管理员可控」不等于可以任打内网（本机跑着 Nginx/SSR/MariaDB）。preview_image_id 已从模型移除（列留库待 DROP，代码禁止读写），GC 对账 SQL 与 imageController 的 friend_link 分支已删除——只被友链引用过的图会被 GC 正常回收。存量本地留存图由 migrate-image-ref.js 清空，部署后到后台逐条重新「抓图」恢复
- 图片统一落 uploads/，services/image/store.js 的 saveImageFile 转 webp + thumb；frontend/home/public/ 静态资源（og-image.jpg 等）随 vite build 进 dist/；缩略图 *.thumb.webp 只被**首页文章列表的小卡封面**消费（列表接口的 `post.coverThumb`，见 server/models/index.js 的 `Post→Image` 关联 + server/vo/post.vo.js）——大图卡、文章页与过渡卡片仍用 `post_cover` 原图，勿把它当通用缩略图用（移动端实测：小卡显示 112–182px，400px 缩略图在 2x/3x 屏都够清晰）
- 涉及图片结构变更的部署顺序：sync-schema.js → migrate-image-ref.js（均幂等，迁移以 URL 匹配为准、不盲信旧 reference_id）→ pm2 restart

### 5. 后端代码约定
- **校验集中在 server/dto/*.dto.js**（白名单过滤）；异常用 server/errors/AppError.js 抛 400/404。**controller 不许直读 `req.body.X` / `req.query.X`**（把整个对象交给 DTO；护栏断言⑧），id 校验只有 `dto/common.dto.js` 的 `parseId` 一套实现（可指定键名），分页只有 `paginate` / `paginateBySize` 两式
- **口令哈希的唯一出口是 `services/auth/password.js`**（`hash` / `verify` + 轮数常量；护栏断言⑨）——bcrypt 不许在别处 import，DTO 只管密码格式（≥8 位）不管哈希
- **错误出口唯一**：一律 `throw`（含 auth 中间件的 401），由 `middleware/errorHandler.js` 统一出响应，别在中间件/控制器里自己 `res.status(4xx).json()`；错误响应形状只在 `errors/contract.js`、日志行格式只在 `utils/log.js`（**运行期代码不许直接 console 写字符串，护栏断言⑥ 把守**；scripts/ 的 CLI 输出豁免）；哪些错误记日志、记到哪，见 server/README.md「错误处理与日志」（铁律：5xx 必记 stderr、4xx 不记、绝不记请求体与 Authorization）
- 响应统一经 server/vo/*.vo.js 组装；**/uploads/ 前缀的唯一出处是 utils/uploadUrl.js**（toUploadUrl 拼、storagePathFromPathname 剥），别在控制器里手拼 URL（改前散在 vo + 两个控制器）
- /api/admin/* 受 auth 中间件保护
- app.js 已设 trust proxy 'loopback'（express-rate-limit 8.x 必需，否则报 ERR_ERL_UNEXPECTED_X_FORWARDED_FOR）
- 分层：routes/*Routes.js → controllers/*Controller.js → services/*（领域能力，碰 I/O/DB）→ models/*；dto/* 校验入参、vo/* 组装出参、jobs/* 由调度器驱动（见第 13 节的三分判据）
- **controller 的职责边界（2026-10-01 收口）**：controller 只做「取参（DTO）→ 调 service / model → 组装（VO）→ 响应」。命中任一条**必须**进 services：① 聚合 / 分组 SQL（fn / col / group / raw）② 一次请求写多张表（必须带事务）③ 被 ≥2 个调用方复用 ④ 领域派生逻辑。单模型单条查询 / 写入可以留在 controller（多数 CRUD 属此）。**controller 里现在 0 事务、0 聚合**（0 事务由护栏断言⑫ 机械把守：controllers/ 出现 `sequelize.transaction` 即违规）——新增接口时按这条判据放代码
- **四条归属判据（2026-10-02 第四次收口，配套上一条；此前「守卫一律在 services」的绝对表述已废）**：
  - **守卫按「依据」分派**：① 依据**业务数据关系**（有无引用、有无关联行）→ `services/`，且 check-then-act 必须同事务（`services/image/remove.js`、`services/tag.js` 的 `deleteTagWithGuard`）；② 依据**请求身份**（只能改自己密码、不能删自己）→ controller（services 不认识 req），但**没有 DB 兜底的部分必须下沉 services 同事务**——样板 `services/admin.js` 的 `deleteAdminWithGuard`（「至少保留一个管理员」没有唯一约束那样的兜底，且计数必须用**锁读** `FOR UPDATE`：只包事务挡不住并发，两个管理员同时删对方会双双读到 2）；③ **唯一性预检**可留 controller，**前提是 DB 有唯一约束兜底**（预检回 **409** + 具体文案如「分类名称已存在」，并发路径由翻译表统一 409「数据已存在，请勿重复提交」，两条路状态码必须一致）；没有兜底的一律按 ① 处理
  - **级联删除只有一个实现**：文章关联清理（post_image / column_post / visit_log 断归属 / post）的唯一出处是 `services/post.js` 的 `removePostCascade(postId, transaction)`；jobs 不得自行实现多表删除，只挑候选 + 事务内重读确认后委派（样板 `jobs/imageGc.js` 的 `gcAbandonedDrafts`）。以后加关联表只改这一处
  - **引用账本为唯一权威**：`services/image/refs.js` 的 `REFERENCE_SOURCES` 定引用语义；`models/index.js` 的关联只服务查询；`scripts/reconcile-schema.js` 的 `FK_TARGETS` 是一次性快照——三方一致性由 `node scripts/check-refs.js` 四向断言（正是为「加持图业务只改了账本」这类静默漂移加的）
  - **可选值归属**：只约束入参形状（键名 / 长度 / 上限 / 枚举合法性）→ `dto/`；一个值要驱动行为（值→窗口、值→类型编解码）→ **值与行为同处一层，不许跨层分居**（改前访问日志的白名单在 dto、偏移表在 services，给白名单加个窗口就静默变成「不筛选」；设置项的类型校验同理，现在键定义 + 编解码 + 校验都在 `config/settings.js`，dto 只把 `{ok:false}` 转成 400）
- 依赖方向只能向下：**共享内核 = config/ / errors/ / utils/**（三者无副作用、无进程引导，各层均可依赖——所以 `models`、`dto`、`vo` 允许 `@config` 是规则本身，不是例外；护栏断言⑩ 把 dto/vo 的 `@` 依赖收成 `@errors`/`@utils`/`@config` 白名单）；utils/ 是**纯函数共享内核**（无 I/O / DB / 进程引导，由护栏断言④ 把守），所以 vo 这类最底层也能用它；services/ 只依赖 models/config/errors/utils，jobs/ 只依赖 services 及以下，**两者都不许出现 req/res**（流式导出由 controller 接管管道）——但**可以用 AppError 表达结果状态**（4xx 语义由抛错方定，如备份导出的 507/409；5xx 与无状态错误由 errorHandler 兜底）；middleware/ 是**管道层**（只被 routes 与 app.js 挂载），不要把错误类型、配置常量、业务逻辑放进去（2026-09 已把 AppError 从 middleware/ 迁到 errors/）
- **config/ 的职责边界（2026-09 重构确立）**：只收「外部能定的值」——① 运维经 env 定的（`config/env.js` 是**后端唯一读 `process.env` 的文件**：默认值 + 类型转换 + 必填校验，缺 DB_NAME / DB_USER / JWT_SECRET 时启动即失败并写明缺哪个；`config/{database,image,backup,auth}.js` 只从它派生，自己不碰 env）② 管理员在后台定的（`config/settings.js`：setting 表键定义 + 文本↔强类型编解码 + 值类型校验 `validateSettingValue`——**加一种类型只改这一处**，属「动态配置」）。判据：**外部能定吗？被两层以上共用吗？**都不满足就是内部实现常量，**一律不进 config/**——限流阈值留在 middleware/rateLimiter.js、GC 保留期留在 jobs/imageGc.js、访问日志保留留在 jobs/visitGc.js、任务间隔留在 jobs/index.js、抓图超时留在 services/ogImage.js、允许格式留在 services/image/store.js、图表窗口白名单留在 dto/dashboard.dto.js（2026-10-02 修正：它只约束「外面能传什么」，属 DTO；旧文写的是 controllers/adminController.js）
- 时区（+08:00）的唯一事实是 config/timezone.js：config/database.js 的 Sequelize timezone 与 utils/date.js 的偏移量都从它派生（二者错开会让「图表日期 vs DB 分组」差一天，实修过）
- `config/database.js` 具名导出 `{ sequelize, dbConfig }`：备份链（services/backup/run.js）必须用 dbConfig 取 dump 凭据与库名，**不要再自己读 env / 写默认值**——两套默认值会让「应用连的库」与「dump 备的库」分叉（缺 DB_NAME 时应用起不来、dump 却静默去备一个叫 blog 的库）
- 新增 env 变量只改 config/env.js（+ .env_example）；新增配置文件或改 require 边后跑 `cd server && node scripts/check-layers.js`（12 类断言：env 唯一出口 / 依赖只能向下 / @config/env 白名单 / utils 纯度 / 时间口径白名单 / 日志经 utils/log / 上传前缀不手拼 / controller 入参经 DTO / 口令哈希唯一出口 / dto-vo 只依赖共享内核 / 别名表一致 / controller 不自己开事务）

### 6. 前端代码约定
- 复用既有组件，不引入新依赖/复杂度
- 列表/编辑页三态状态机：文章 draft / published / trash；编辑页按 currentStatus 分流按钮，trash 只读
- 列表返回保留 tab：列表 activeTab ↔ route.query.status 双向同步
- 加载体验：admin 登录页预加载遮罩；home 的加载体验见第 10 节（文章过渡卡片）
- API 调用统一走 src/api/*（唯一传输在 src/api/client.ts）；异步动作包 useAsyncAction

### 7. 本地环境坑
- PowerShell/bash 中 $Code 须反引号转义：E:\`$Code\...，否则路径展开为空
- 本地 Node fetch 走不了代理，github.com / yulabu.cn 等本地 fetch failed 属正常，生产服务器直连正常
- Node 22 必须 NodeSource；Debian 自带 Node 18 缺 npm 会构建失败
- 本地 Windows 务必使用 Node 22/24 LTS（项目 engines 要求 ^22.18.0 或 >=24.12.0）。Node 25（奇数版）/ npm 11 会导致 peer dependency 解析异常，拉取最新代码后前端报 `Failed to resolve import`（实踩 `@vue/devtools-api`、`echarts/core` 缺包）。解决：① 切到 Node 22/24 LTS；② 或在 package.json dependencies 显式补齐 peer dep；③ 或删 `node_modules` + `package-lock.json` 重 `npm install`
- package-lock.json 与 package.json 不同步会导致 npm ci 失败，用 npm install 重生成后提交 lock

### 8. 验证方式
- 后端 DTO 可直接：node -e "require('module-alias/register'); require('dotenv').config(); const {...}=require('@dto/...')" 验证
- 后端三条常驻护栏（零依赖、不连库、不占端口）：`node scripts/check-errors.js`（错误翻译表 25 条断言：原 23 条 + 2026-10 新增「回环免限流 / 访客按 XFF 命中 429 并记 warn」2 条）、`node scripts/check-layers.js`（12 类：env 唯一出口 + 依赖只能向下 + @config/env 白名单 + utils 纯度 + 时间口径白名单 + 日志经 utils/log + 上传前缀 + controller 入参经 DTO + 口令哈希 + dto/vo 依赖白名单 + 别名表一致 + controller 不自己开事务）、`node scripts/check-refs.js`（引用图四向一致：账本 ↔ 模型关联 ↔ FK_TARGETS，有意分歧须登记在 EXCEPTIONS）；动了错误层/依赖边/配置读法/任务分层/限流桶挂载/持图业务就该跑
- home 以 npm run build 通过 + npm run check（astro check）0 error + `npm run check:layers`（8 条分层断言，零依赖）通过为门槛；admin 仍以 npm run build（含 vue-tsc）为门槛
- SSR 链路验证：本地起 server（npm run dev）后 `curl -s localhost:4321/post/<id> | grep -E 'og:title|og:image'`
- 业务改动建议生产实跑：curl -I https://blog.yulabu.cn/og-image.jpg、pm2 logs --err

### 9. 备份系统（2026-09）
- 结构：cron（/etc/cron.d/blog-backup，每天 04:00）→ server/scripts/backup.js（CLI 壳）→ server/services/backup/run.js（核心，controller 与 cron CLI 共用；HTTP 管道在 backupController，导出流不会认识 res）；产物在 <仓库根>/backups/（db/ 存 dump 保留 BACKUP_KEEP=30 份，uploads/ 为 rsync 镜像，排除 .tmp）；配置在 server/config/backup.js，git 已忽略 /backups
- dump 命令自动探测：mariadb-dump（生产）→ mysqldump（macOS brew）；凭据经临时 defaults-extra-file（chmod 600）传入，值与应用连接共用 config/database.js 的 dbConfig（唯一出处，2026-09 起不再自读 env），MySQL 系 dump 追加 --set-gtid-purged=OFF（向启用 GTID 的库导入会报错，实踩）；产物 <1KB 视为失败删除
- 后台「备份管理」页（/admin/backups）：列表 / 立即备份 / 导出完整包 / 删除 dump；接口挂在 adminRoutes.js（GET·POST /admin/backups、GET /admin/backups/:filename/export 流式下载、DELETE）；文件名白名单 ^blog-\d{8}-\d{6}\.sql\.gz$ 防路径穿越；备份与导出经 backups/.lock 文件锁跨进程互斥（wx 原子创建，PID+时间戳，重复触发 409，残留超 30 分钟自动接管；cron 与 pm2 是两个进程，模块级变量防不住跨进程，实改为文件锁）
- 导出包 = dump + 最新 uploads 镜像 + restore.sh（MYSQL_PWD 传密码，空密码不退化成交互提示，实踩）+ README-恢复说明.txt；**不含 server/.env**（迁移单独 scp）；打包前检查磁盘剩余空间（不足 507）
- 前端下载用 http.get<Blob> + responseType:'blob' + timeout:0（http.ts 全局 15s 超时会掐断备份/导出，实踩）；http.ts 响应拦截器已支持解析 blob 错误体中的 JSON message
- 恢复/迁移完整步骤见 deploy/backup.md（含异机迁移 checklist 与 cron 内容）；本地开发无 uploads 目录时镜像步骤告警跳过

### 10. 前台 Astro 群岛架构（2026-09 重构，home 由 Vue SPA 迁移）
- 渲染分工：6 个列表页（/ /archive /about /friends /columns /diary）构建时静态预渲染；/post/[id]、/columns/[id]、/404 走 SSR（页面内 `export const prerender = false`）。发新文章无需构建，文章页实时 SSR 出完整 HTML（正文 + per-post og 标签）
- 结构：src/pages/*.astro 即路由（无 vue-router）；src/layouts/Layout.astro 承接全局 head（OG/字体/主题内联脚本/ClientRouter）与常驻岛（Navbar / ToastHost / MusicPlayer / PostSplash）；**页面级 Vue 岛在 src/islands/**、可复用 UI 在 src/components（2026-10 分层重构，见第 14 节）
- 数据流：**只有一套取数实现** src/api/*（同构 fetch，见第 14 节）——页面 frontmatter 用 `apiSoft(...)` 在构建期/SSR 取数并经 props 注入岛，岛内 `if (!props.initialXxx)` 才回退自行拉取；预渲染页水合后用 createSilentSync 对账
- **SSR 回源的限流与失败降级（2026-10 止血）**：SSR 回源固定来自本机（不带 XFF），后端 `publicLimiter` 因此对 **127.0.0.1 / ::1** 放行（`middleware/rateLimiter.js` 的 `isLoopbackIp`）——它一次文章页渲染要打 4 个公开接口（详情 + prev + next + settings），共用访客的 60/min 桶时全站约 15 次/分钟就饱和；**访客经 nginx 带 XFF 按真实 IP 分桶，防护不受影响**。前端侧（`post/[id].astro`、`columns/[id].astro`）取数失败**区分 404 与其它**：404 才 `rewrite('/404')`，429/5xx/网络错先重试一次、仍失败则抛错（Astro 返回 5xx）——改前一律降级成 404，限流时真实文章对外谎称不存在（读者与搜索引擎都会当真）
- 跨岛状态：**pinia 已删除**（2026-10）——各岛是独立 Vue app 实例、pinia 各注一份互不同步，跨岛共享一律用 stores/ 的模块级单例；主题靠 CSS 变量（setTheme 写 documentElement）天然全局生效；首页 Hero 折叠态经自定义事件 yulabu:hero-collapsed 同步给 Navbar；音乐播放器靠 transition:persist 跨页存活（persist 挂在普通 div 包装上，勿直接挂 astro-island，会触发 swap 的 moveBefore 边界 bug，实踩）
- 图标全部离线：AppIcon.vue（同步渲染 getIcon body，SSR/客户端输出一致、零 pop-in）替代 @iconify/vue 的 Icon 组件（其 Icon 走异步 watcher，SSR 首帧只有占位 svg，且运行时拉 api.iconify.design 会触发 Edge Tracking Prevention 刷屏）。图标子集由 scripts/build-icons.mjs 生成 src/assets/icons.json（@iconify-json/material-symbols + @iconify-json/mdi 抽取，新增图标先在脚本 ICONS 清单登记再 npm run icons）；勿在模板直接用 @iconify/vue 的 Icon
- 水合稳态纪律：岛内任何「客户端专属状态」（URL query、sessionStorage、主题、matchMedia）一律不给 SSR 期首帧用——setup 期初值与 SSR 保持一致，onMounted 里再同步真实值（Navbar 的 searchInput/heroCollapsed/themeIcon、HomeView 的 searchQuery、PostDetail 的 mdTheme 皆如此，实踩 Navbar 根级 v-if mismatch）；根级 v-if 的岛组件是 mismatch 高危形态，新增岛时避免；日期统一按北京时间取部件（utils/date.ts 的 beijingShifted，消除服务器 UTC 与访客本地时区的文本差）
- 文章过渡卡片（点列表/上下篇进文章时弹封面+标题+摘要，2 秒后淡出）：信号走 window.__yulabuSplashId（utils/postSplash.ts 的 markPostSplash 写入；勿改用 sessionStorage——ClientRouter 重建脚本场景下读取不可靠，实踩）；卡片是 post/[id].astro 里 SSR 预印的隐藏模板（默认 opacity 0 + pointer-events none，无 JS/直接访问/爬虫完全无感），内联脚本 data-astro-rerun 消费信号后显示，SPLASH_DWELL_MS=2000 可调；脚本必须幂等（重复执行不得移除已展示卡片，实踩）
- Astro 7 实踩坑：astro.config.mjs 必须静态对象导出——.mjs 配置加载器不求值函数式 defineConfig，adapter/integrations 会整个丢失；ToastHost 根节点是 Teleport to body，必须 client:only（SSR 水合会在 body 触发 mismatch 清理误删相邻岛，实踩删过 Navbar）；凡依赖 window/localStorage/Audio 的代码在岛内要守卫（stores/ui.ts 用 typeof window 判定，MusicPlayer 整岛 client:only）；ClientRouter 软导航后内联脚本需 data-astro-rerun 才重跑，全局监听挂 astro:page-load / astro:after-swap
- 首页全屏 Hero 的折叠态防弹跳：老访客（sessionStorage homeHeroCollapsed=true）进入首页必须首帧即折叠布局——Layout 内联脚本首帧前给 html 打 data-hero-collapsed（与 data-theme 同一 applyClientState 脚本、after-swap 重挂），HomeHero 用 `:global(html[data-hero-collapsed] .home-hero …)` 全量镜像折叠样式（height/content padding/标题字号/波浪/scroll-hint）。**Vue scoped 对「:global() + 后代 + :deep()」混用会丢弃后代部分**（实测规则塌缩成只匹配 html），必须把整个选择器包进一个 :global()（实踩）
- **SSR 岛内禁止裸 `<Teleport to="body">`**：弹层关闭态 SSR 仍输出 teleport 注释标记，与 Astro 向岛内注入的水合脚本错位 → 每次进入必报 hydrateTeleport mismatch（实踩 DiaryView 灯箱、AboutNode 弹出层）。修法：Teleport 加 `v-if="isMounted"` 守卫（挂载后才挂，弹层本就只在交互后出现）；ToastHost/PostSplash 这类纯弹层走整岛 client:only。现有 Teleport 均已守卫，新增弹层时沿用此纪律
- 文章过渡卡片：**常驻遮罩岛 PostSplash.vue**（client:only + 外包 div transition:persist，与 MusicPlayer 同模式）——点击文章瞬间在当前页弹出（数据取自被点击条目：markPostSplash(post) 挂 window.__yulabuSplash + 广播 yulabu:post-splash 事件，四个调用点：列表/归档/专栏目录/上下篇），文章 SSR 在卡片背后加载；astro:after-swap 时 URL 匹配才从点击起算满 2s（SPLASH_DWELL_MS）淡出，SSR 慢则显示到加载完（SPLASH_MAX_MS=6s 兜底），中途改点其他页立即隐藏。post/[id].astro 不再烘焙卡片（无 JS/直接访问/爬虫/分享链接无事件，卡片永不出现）。勿用 sessionStorage 传卡信号（ClientRouter 重建脚本场景不可靠，实踩）；persist 勿直接挂 astro-island（moveBefore 边界 bug，实踩）
- md-editor-v3 扩展全本地化（utils/mdEditorSetup.ts，_app.ts 与 Layout 双侧引入）：config() 注入本地 highlight.js/lib/common 实例 + 本地主题 css（highlight.js/styles/*.css?url），MdPreview 加 no-katex/no-mermaid/no-echarts——**根除 unpkg.com 运行时外链**（该域被 Edge 列入跟踪器名单，每次整页加载文章注入 7 个外链触发 Tracking Prevention 刷屏）；服务端与客户端同一实例保证 SSR 代码块高亮与水合一致；vite.optimizeDeps.include: ['md-editor-v3'] 固化预包（dev 重启后旧 hash 504 Outdated Optimize Dep 的减发措施，dev 专属现象）
- **LXGW 文楷字体自托管，桌面与移动统一**：npm 依赖 lxgw-wenkai-webfont（1.7.0），**只引 regular + bold 两档**（`lxgwwenkai-regular.css` / `lxgwwenkai-bold.css`）—— 这是唯一"用不上"的部分：Mono 三档与 Light 一档经全站 grep 确认零引用（582 条 @font-face → 194 条，字体 CSS 565 KB → 183 KB）。以 `?url` 导入后由 `Layout.astro` 用 `<link rel="stylesheet" media="print" onload="…">` 非阻塞引入；**不能写回 main.css 的 `@import`**：那样会与全局样式合并成一个渲染阻塞样式表（实测 565 KB / gzip 217 KB，占首屏阻塞资源 223 KiB 中的 212 KiB）。woff2 子集 194 个 / 约 9.2 MB 随构建进 `dist/_astro`，浏览器按 unicode-range 按需加载。**不要再按视口砍字体**：曾试过移动端不加载，实测首页可省 590 KB、archive 可省 1,007 KB，但桌面/移动观感会不一致，已被否决
- **隐藏容器里的资源与岛都要能被"不加载"**：`<img>` 加 `loading="lazy"`（懒加载图在 `display:none` 子树里永不与视口相交 → 永不请求；桌面端在首屏内仍立即加载）、Astro 岛用 `client:visible`（容器被 CSS 永久隐藏 → IntersectionObserver 永不触发 → 不下发该岛的 JS、不水合）。**约定：给 `client:visible` 的岛，其容器若改回可见必须同步把指令改回 `client:load`**（否则该岛在窄屏静默失效）。当前用例：`HomeHero`、`PageFrame` 的 `WelcomeBanner`（≤768px 隐藏）、首页左栏 `TagBox`（≤1024px 隐藏，顺带消掉它那次重复的 `/api/tags`）
- Layout 无 cdn.jsdelivr.net 字体外链——**站点第三方域名请求 = 0**（Edge Tracking Prevention/国内 jsdelivr 不稳双收益）。控制台最后的 [Intervention]/message channel 报错为浏览器/扩展自身行为，任何站点无法消除
- 依赖：astro/@astrojs/vue/@astrojs/node + devDeps @astrojs/check；vue-router/vite/vue-tsc 已移除；md-editor-v3 的 MdPreview 已验证可在 Node SSR 渲染（含代码高亮）
- dev 工作流：根目录 npm run dev:home = server(3000) + astro dev(5174，vite proxy /api、/uploads)；本地验证 SSR 用 `node dist/server/entry.mjs`（standalone，不自动读 .env，API_BASE_URL 走 pm2 env 注入）
- 死代码：src/_archive/（MapView 世界地图，未接线；tsconfig/依赖扫描已排除，不参与构建）；加载遮罩 TopProgressBar/LoadingOverlay 与 src/router、src/main.ts、src/App.vue 已删除（文章过渡卡片接棒加载体验）

- **跨页常驻岛：个人卡片（2026-09；友链 2026-10-04 加入）**——**首页 / 归档 / 日记 / 友链**四页左栏是同一个 DOM 节点，四页之间来回切换零重建、位置不动（实测 absTop 388 / left 84 / 300×330 全程一致，且节点上的 JS 属性仍在）。
  - **`transition:persist` 只在 `.astro` 模板里生效**：Astro 编译期把它改写成 `data-astro-transition-persist`，ClientRouter 才认；写在 Vue SFC 里只是原样透传一个属性。所以卡片必须由 Astro 渲染 → 新增 `src/components/astro/PageFrame.astro` 作为页面骨架（全宽刊头槽 + 左栏 rail + 主内容 main），首页与归档页都用它，两页的 persist key 必须同名（`personal-card`）。persist 挂在普通 div 上，不要直接挂 astro-island（moveBefore 边界 bug）
  - 骨架左栏 ≤1024px 隐藏（沿用原首页左栏约定）；归档页、日记页、友链页左栏除卡片不放别的（rail 槽留空），首页 rail 槽放 TagBox
  - `HomeView.vue` / `ArchiveView.vue` / `DiaryView.vue` 已退化为纯内容（DiaryView 只留 720px 正文）；2026-10 起另外 4 个视图（About / Columns / ColumnDetail / PostDetail）走 `PageFrame.astro` 的 `withRail={false}` 单列模式（友链曾在此列，2026-10-04 起改回双列加入上面的常驻卡片家族），`SitePageFrame.vue` 已删除 —— **骨架全站唯一**，刊头（WelcomeBanner）因此成为与视图平级的 client:visible 岛
  - 音乐播放器（MusicPlayer）的**完全展开白名单**是 `EXPAND_PATHS = ['/', '/diary']`：桌面端在这两页展开成完整面板，其余页面是迷你条；移动端 ≤768px 一律迷你条。它靠 `transition:persist` 跨页存活，所以这里只改「在哪几页展开」，播放状态不受影响
  - **slot 属性不能直接挂在 Vue 岛组件上**：Astro 传给框架组件的 slot 会作为 fallthrough 属性进入 Vue，而服务端渲染时 Astro 不输出该属性 → 水合属性不匹配告警（实测首页 banner/rail 两处）。要包一层普通元素：`<div slot="rail"><TagBox client:load /></div>`
- **标签筛选的跨岛共享状态（stores/tagFilter.ts）**：TagBox 现在挂在骨架左栏、PostList 在中栏，二者分属不同岛，Astro 传给岛的 props 又是静态的，所以用**模块级 ref**（同一份 ESM 模块图，同页所有岛共享同一实例）。**不要用 pinia**（已删除）——每个岛是独立 app 实例、store 各注一份互不同步；也不要绕 DOM 事件，模块单例更简单。新增跨岛共享状态时沿用这个模式
- **预渲染页在构建期烘焙真实内容**：5 个列表页 frontmatter 顶层 await `src/api/*`（包一层 `apiSoft` 做 fail-soft）取数并经 props 注入岛，产物 HTML 里就是真实文章/标签/专栏/日记/友链（首屏不再先闪「加载中」空壳，爬虫/分享可读）
  - **必须 fail-soft**：取数失败一律返回空值、绝不拦构建（实测死后端仍构建成功，各页打印 `[api] GET /xxx 取数失败…该页已降级` 告警并退化为客户端取数）。代价：**构建时需后端可达**才能烘焙出内容
  - **烘焙切片必须与客户端对账切片一致**（/posts 用 `limit`、/diaries 用 `pageSize`；PostList 的 PAGE_SIZE 与 index.astro 的 fetchPosts 必须同值），否则指纹永不相等 → 每次访问无谓重绘
  - 岛内用 `src/utils/liveData.ts` 的 `createSilentSync`：指纹一致则**完全不动 DOM（零闪烁）**，不一致才替换，取数失败静默吞掉 → 保住「发新文章无需构建」
  - **Astro 对 JS Vue SFC 的 props 推断很粗**：`type: Array/Object` 被当成必填 `unknown[]`/`Record<string,any>`，且**函数式 default（`default: () => []`）会让 .vue 类型生成整个失败**（报 `Module has no default export`）。所以烘焙型 props 一律不写 default、由页面必定传入、组件内 `props.x || []` 兜底；也不要传 `null`（类型不接受），失败就传空数组/空对象
- **页脚（SiteFooter.astro，纯 Astro 零 JS）**：只有站点名 + GitHub/Email + 版权 + 备案号，**刻意不放导航链接**（导航已在 Navbar）。三个坑：① **必须自带不透明底色**（`background-color: var(--bg-page)` + 玻璃渐变）——本项目 body 没有背景色，页面底色由 .page-frame 这类容器提供，而页脚在它们之外，只给半透明底会透出浏览器画布（白），暗色模式下底部漏浅色带且文字只有 2.9:1（实测）；② 文字用 `--color-heading` / `--color-text`，不要用 `--color-primary`（白玻璃底上仅 3.2:1，16px 不达 AA）；③ **备案号（粤ICP备2026140579号-1）须按法定要求链到 https://beian.miit.gov.cn/**，与版权同组（`.site-footer__legal`，内部 6px）落在最下一行，12px `--color-text`、静止态不加图标不做徽章（法定信息不是设计元素），只 hover 时浮到 `--color-heading`。它是域名级信息、页脚挂在 Layout 上，所以 yulabu.cn / www / blog / admin 四个域名全站都显示（实测浅暗双主题）

### 11. 访问统计（visit_log + daily_stat，2026-09）
- 分工：`visit_log` 只存原始明细（公开写入 + 后台分页列表 + 今日实时统计 + GC），保留 90 个**完整自然日**；`daily_stat` 存每日聚合（stat_date 主键 + pv + uv，一天一行，**永久保留**）。工作台折线图的 visitsByDate 与访问日志页「总浏览量/总独立访客」只读 daily_stat；「今日 PV/UV」实时读 visit_log（今日窗口永远在保留期内，无丢失风险）
- 聚合：`jobs/dailyStat.js` 的 aggregateDailyStats 全量重算（`SELECT DATE(created_at) … GROUP BY DATE(created_at)` → `bulkCreate(updateOnDuplicate:['pv','uv'])`，幂等自愈），`jobs/index.js` 注册表启动即跑一次（自动回填日志中尚存的近 90 天）+ 每 10 分钟一次；24h 的 visitGc 任务**先聚合再清理**（注册表里的依赖声明，不是进程入口里的顺序），聚合失败则跳过本次清理。CLI：`cd server && node scripts/daily-stat.js`
- **三条勿破坏的不变式**：① 聚合只 UPSERT 日志中仍存在的日期，**绝不写 0 行、绝不删除 daily_stat 行**——日志里没有的日期（已过保留期）不在分组结果里，历史行因此安全；别为了「补齐空白天」预生成 0 行，那会让这条保证失效 ② visitGc 的 cutoff 必须按北京自然日对齐（`beijingDayStart(shiftDateStr(beijingDateStr(), -(RETENTION_DAYS - 1)))`）：用「now-90d」时间戳截断会把最老一天切成半截，重算时用半截数据覆盖完整行（实修） ③ 后端判定「今天」/「年月」一律走 `utils/date.js` 的 beijingDateStr / shiftDateStr / beijingDayStart / beijingYearMonth，勿用 `new Date().setHours(0,0,0,0)`——库里 DATETIME 按 +08:00 存墙钟，而生产 Node 进程时区可能是 UTC，会错开 8 小时（北京时间 00:00–08:00 图表日期序列与 DB 分组差一天，实修）。**2026-09-30 又收口三处曾漏网点**：后台访问日志筛选（today / 7days / 30days 改为北京自然日，含今天共 N 天）、工作台「今日新增」卡（原用本地零点，与同一文件下方的图表口径冲突）、文章归档的年月分组（改用 beijingYearMonth）；并加护栏断言⑤（时间口径白名单：`setHours` / 取日期部件 / `toLocaleString` 只许出现在登记过的例外文件——**命名/展示类时间用进程本地时间是有意例外**（上传分片目录、备份文件名、导出说明文本），白名单在 check-layers.js 的 LOCAL_CALENDAR_ALLOWLIST；`node scripts/check-layers.js` 现在 12 类断言）
- 口径（已知取舍）：totalUV = SUM(daily_stat.uv)，是各日去重后求和，长期访客会被逐日重复计入（偏大但永不缩水）；「清空访问日志」只删明细，不再重置总量，要重置历史统计须手工清 daily_stat
- 部署：纯增量新表，无数据迁移；建表由 `sequelize.sync()` 负责（启动即自动回填；`visit_log` 的 `created_at` 索引也由模型声明、sync 补建）。首次上线只能回填日志尚存的最近 90 天，更早历史无法找回
- 前端零改动即可受益（接口字段与结构未变）；后续若要 90 天/一年窗口，后端 range 白名单已支持 90days/365days，前端加下拉项即可

### 12. 评论区（giscus，2026-09）
- 选型：giscus（评论存在 GitHub Discussions，无后端、无数据库改动）。评论仓库是**独立的公开仓库 `yulabu/Blog_Content`**（分类 `评论`，Announcements 类型），与源码仓库解耦——源码仓库哪天转私有，存量评论不受影响；仓库必须保持 public，否则评论立即不可见
- 组件 `src/components/post/GiscusComments.vue`，只挂在文章页（PostDetailView 正文卡之后）。客户端运行时注入 `client.js`——**不要在模板里写死 `<script>`**：ClientRouter 软导航后模板脚本不会重跑，评论区会静默消失；滚到评论区前 300px 才注入（没读到文末的访客零第三方请求）；`data-mapping="pathname"` 让 yulabu.cn / blog.yulabu.cn 的同一篇文章共用一条讨论帖
- 三条实踩：① giscus 把「该页面还没有讨论帖」（`Discussion not found…`）也走 `error` 字段回传，而那正是每篇新文章最正常的状态，**不能据此判失败**，只留 console.warn；② 消息要按 `event.source === 当前 iframe.contentWindow` 过滤（postMessage 是窗口级广播，软导航残留的旧 iframe 也会发到同一个监听器）；③ 主题 setConfig 必须去重，只在主题真的变化时才推
- 主题：用 giscus 自带的 `noborder_light` / `noborder_dark`（官方「无边框」版本，嵌在玻璃卡片里不会出现「卡片套卡片」），随站点亮暗经 setConfig 热切换、不重载 iframe；推送前按主题名去重（每条消息都推一遍会让 widget 反复应用主题）。**不再自托管配色主题**——试过一版按站点变量覆盖的配色主题，观感被否；真要再做，代价是 nginx 必须给主题 CSS 放 `Access-Control-Allow-Origin`（样式表由 giscus.app 的跨域 iframe 加载，缺头会静默变成无主题），且本地 dev 因 http/https 混合内容规则看不到效果
- 目前只有文章页有评论；要给日记/专栏页开，把同一个组件放进对应视图即可（pathname 映射会自动各成一条帖）
- **评论区总开关**：后台「系统设置」页（`/admin/settings`）——关掉后文章页不再渲染评论区。设置存在 `setting` 表（key/value），键定义集中在 `server/config/settings.js`：**新增设置项只加一行 + dto 白名单**，不需要改表结构、不需要给老库补数据（缺行即用 default）。读走公开的 `GET /api/settings`（只吐 public 键），写走 `PUT /api/admin/settings`（登录态 + 白名单 + 类型校验，未知键/非布尔值一律 400）
- 开关生效链路：`post/[id].astro` SSR 时取 `/api/settings`，把 `commentsEnabled` 经 props 注入 `PostDetailView`，为 false 时整个评论区不渲染（岛也不挂）。取不到设置接口时按**开启**处理（fail-soft，与其它取数一致）
- `setting` 表由 `sequelize.sync()` 启动时自动创建（**新表不需要 sync-schema**，那是给 ALTER 用的），且随整库 dump 进备份包——恢复备份后开关状态不丢
- giscus 的第三方请求只发生在评论区进入视口之后：`giscus.app`、`api.github.com`、`avatars.githubusercontent.com`（评论头像），以及主题里官方自带的两个 `github.com` 加载图

### 13. 后端分层：utils / services / jobs 三分（2026-09 重构）
改前 `utils/` 一间屋住四种角色（纯函数 / 领域服务 / 定时任务 / 一个 409 行的备份功能模块），且图片引用账本有两个真相源（GC 的 SQL 与 imageController 的查询各写一遍表清单），漏改一处就把在用的图当孤儿删掉。现在按**纯度**三分，判据与护栏都固化下来：

- **判据（新文件放哪儿）**：① **碰 I/O 吗**（磁盘/DB/网络/子进程）→ 不碰进 `utils/`，碰了问 ② ② **谁驱动它**：进程内定时器调度、批量改数据、幂等自愈 → `jobs/`；被请求或其它代码按需调用 → `services/`
- `utils/`（纯函数/纯常量共享内核，只有 4 个文件）：`date.js`（北京时间日界）、`log.js`（日志行格式：`infoLine` / `warnTagLine` / `errTagLine` / `errorLine` / `warnLine`）、`uploadUrl.js`（`/uploads/` 契约：`toUploadUrl` 拼、`storagePathFromPathname` 剥）、`imageRefTypes.js`（图片引用类型名：`REF_TYPE` + 伪类型 `ORPHAN_TYPE`）。**护栏断言④ 禁止** utils 里出现 `fs` / `child_process` / `express` / `multer` / `sharp` / `sequelize` / `mysql2` / `dotenv` / `module-alias` / `@models` / `@services` / `@jobs`
- `services/`（领域能力，**不认识 req/res**）：`image/refs.js` 图片引用账本、`image/derive.js` URL→image_id 派生、`image/store.js` 文件层、`image/upload.js` 上传落库、`image/remove.js` 删图（引用守卫 + 先事务删行再删文件）、`ogImage.js` 抓图、`backup/{layout,lock,run,export,assets}.js` 备份链、`auth/password.js` 口令哈希唯一出口、`tag.js` / `dashboard.js` / `visit.js` / `post.js` / `column.js` / `admin.js` 六个域的聚合、守卫与多表写（2026-10-01 从 controller 下沉、2026-10-02 加 admin.js；判据见第 5 节）——其中 **`post.js` 的 `removePostCascade` 是文章级联删除的唯一实现**（判据见第 5 节）
- `jobs/`（定时任务，**不认识 req/res**）：`imageGc.js`、`dailyStat.js`、`visitGc.js`，注册表 `jobs/index.js` 管「间隔 / 启动即跑 / 依赖谁成功 / 耗时阈值」并统一提供**重入守卫**（同一任务在途则跳过；依赖调用复用同一轮）、**连续失败计数**、**异常兜底**，`app.js` 只调 `startJobs()`。**jobs 不自己写多表级联删除**（只挑候选 + 事务内重读确认，删除委派给 services；样板 `imageGc.js` 的 `gcAbandonedDrafts` → `removePostCascade`）。手工入口统一 `node scripts/<任务>.js`（CLI 壳负责 module-alias + dotenv + 退出码，任务模块本身不是程序；与常驻任务之间**没有**互斥锁，手工跑前先确认没在跑）
- **图片引用账本的唯一出处是 `services/image/refs.js`**：`REFERENCE_SOURCES` 一张清单同时派生孤儿对账 SQL、后台按类型筛图、反查引用位置；gc 任务、imageController、migrate-image-ref 三处都从它取。**新增持图业务只改这一处**（改前要在 gc 的 SQL 与 imageController 两处各加一遍）——但账本不是全部：模型关联（查询取缩略图）与 `FK_TARGETS`（老库外键基准）是另外两份描述，三方一致性由 `node scripts/check-refs.js` 四向断言（2026-10-02 加；只改账本会漏掉另两份，正是这个脚本要拦的静默漂移）。**类型名（post_content / cover / diary + 伪类型 other）的唯一出处是 `utils/imageRefTypes.js`**——HTTP 白名单与 attachReferences 的展示标签都从它派生（改前三处各写一份，日记封面在账本叫 diary、白名单里没有、标签写成 cover，导致它任何筛选都查不到）
- **上传响应形状的唯一出处是 `vo/image.vo.js` 的 `uploadedImageVO`**：批量上传与专栏封面上传共用，字段固定 `{ image_id, url, thumb_url }`（前端 `UploadedImage` 契约，别换成 `imageVO`）
- 迁移前的老路径（`utils/image.js`、`utils/imageStorage.js`、`utils/ogImage.js`、`utils/backup.js`、`utils/gc.js`、`utils/dailyStat.js`、`utils/visitGc.js`）**已不存在**，引用它们会 require 失败；CLI 也从 `node utils/dailyStat.js` 改为 `node scripts/daily-stat.js`
- 备份链的一条行为修正：导出时客户端断开现在会结束 tar 进程（改前只记 clientGone，Node 仍持有读端导致 tar 永久阻塞、`.lock` 一直不释放，中断一次导出后 30 分钟内备份都被 409）

### 14. 前台分层与 UI 规范（2026-10 重构，配套护栏 scripts/check-frontend-layers.mjs）

改前的病：取数有 3 条并行链路（axios/http、serverData、ssrFetch）各自一份 API_BASE 与错误策略；
页面级 Vue 岛同时干「取数 + 状态 + 布局 + 交互」；两套页面骨架（PageFrame.astro / SitePageFrame.vue）
让刊头在部分页被包进视图岛；分类 chip 4 份、封面首字兜底 5 份、卡片网格 2 份逐字相同；
跨岛状态 4 种机制并存（pinia / 模块 ref / 模块 reactive / DOM 事件）。现在按下面的规矩收口：

- **分层与依赖方向**（只能向下，由 `npm run check:layers` 的 8 条断言把守）：
  `pages/`（路由 + 取数 + 组装）→ `layouts/` `components/` `islands/`（页面级岛）→ `stores/` `api/` `utils/`。
  `api/`、`utils/` 不许 import 组件与 store；`components/ui/` 不许 import 业务模块；`islands/`、`components/`
  不许 import pages/layouts。`components/astro/` 里 import 的 `.vue` 必须显式带 `client:*`，
  有意零 JS 的（PersonalCard、页脚 AppIcon）登记进脚本的 `STATIC_VUE_ALLOW`。
- **数据层只有一个传输**：`api/client.ts` 是唯一认识 URL 前缀 / 超时 / 错误形状的地方（同构：构建期、SSR、
  浏览器同一实现，浏览器走相对 `/api`、服务端走 `API_BASE_URL`；服务端超时 4s 是 fail-soft 的前提）。
  四个出入口：`apiGet`/`apiPost`（抛 ApiError）、`apiTry`/`apiTryDetail`（判别联合；详情页 404 分流 +
  非 404 重试一次的唯一实现）、`apiSoft`（失败返回 null + 一行 `[api] …已降级` 告警，给预渲染/SSR 列表）。
  **端点、参数与返回类型同处一个资源模块**（`api/post.ts` 等，类型以 `server/vo/*.js` 为基准）。
  构建期烘焙与客户端对账**必须调同一个函数**（如 `getPosts(1, POSTS_PAGE_SIZE)`）——参数切片不一致会让
  指纹永不相等、每次访问无谓重绘；`fetch(` 只允许出现在 client.ts（护栏断言④，静态资源按需加载登记例外）。
- **UI 层**：设计令牌唯一出处是 `styles/tokens.css`（颜色写在 `@theme` 里 → 生成 `bg-page`/`text-heading`/
  `border-line` 等工具类；暗色只改同名变量的值，**颜色因此不需要 dark: 变体**）。
  **不引 preflight**（`global.css` 只 import theme + utilities）：存量组件依赖自己的 reset 语义，
  preflight 会额外重置 `img/svg`（AppIcon 行内用法首当其冲）、`button`、`h1-h6`、`ul/ol`。
  reset 写在 `@layer base`，工具类在 utilities 层天然压过它。
  **禁止混用**：一个组件要么全用工具类、要么全用手写 scoped CSS —— 无 layer 的 scoped 样式永远压过
  有 layer 的工具类，混用同一属性会得到「类加了没反应」。跨页逐字重复的布局类放 `styles/components.css`
  （`.card-grid` / `.page-container` / `.card-body`·`.card-title`·`.card-text`）。
  原语在 `components/ui/`：AppIcon（离线同步渲染）、GlassPanel（玻璃卡）、ContentState（空/加载/失败 + 重试）、
  Pagination、CategoryChip（soft/solid × sm/md）、CoverFallback、SectionHeader、Skeleton。
- **状态层三分法**：`stores/` = 跨岛共享**状态**（模块级单例，全页唯一；pinia 已删除）；`composables/` =
  组件级**行为**（副作用与生命周期，无共享状态）；`utils/` = **纯函数**。写 stores 要守三条纪律：
  只在客户端写、模块顶层不碰 window/localStorage、SSR 首帧不读（主题由 Layout 内联脚本写 html 属性）。
- **页面状态三态齐全**：加载用 `Skeleton`（不再写「加载中...」）；失败用
  `ContentState kind="error" retry-text="重新加载" @retry="..."`（页面上留可重试出口，不只弹 toast）；空用
  `ContentState kind="empty"`。
- **骨架全站唯一**：`components/astro/PageFrame.astro`（`withRail` 决定两列还是单列；单列用 `display: contents`
  的包装保证不留内边距与层叠上下文）。刊头 WelcomeBanner 是与视图平级的 client:visible 岛。
  注意：`withRail` 两列模式下，`HomeView` 的 `.home-layout` **第二条轨道是预留空列**，删掉它会让内容列
  从 604px 变 640px（实测页面高度 +19px）——那是视觉变化，不是清理。
- **改了前台怎么验**：`npm run build` + `npm run check` + `npm run check:layers` 三条全绿是底线；
  涉及视觉/布局的改动，用「改造前产物 + 计算样式签名逐元素对照」验证（见 deploy/astro.md 的说明），
  别只凭肉眼。
