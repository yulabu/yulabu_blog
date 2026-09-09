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
MariaDB 10.11.18（Debian 包，替代 MySQL，与 mysql2 兼容）
Nginx 1.22.1（静态托管 + 反向代理）
PM2 5.x（守护后端，systemd 开机自启 pm2-root.service）
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
│   ├── home/dist/         # 主站静态产物（yulabu.cn 与 blog.yulabu.cn 共用）
│   └── admin/dist/        # 后台静态产物（admin.yulabu.cn）
└── uploads/               # 文章/友链图片（UPLOAD_DIR=/var/www/yulabu_blog/uploads）
数据库
库：blog（utf8mb4）
账号：blog_user@localhost（仅本机，bind-address=127.0.0.1）
表由后端启动时 sequelize.sync() 自动创建；结构变更靠 sync-schema.js
Nginx
站点文件：/etc/nginx/sites-available/yulabu 与 yulabu-admin（已软链到 sites-enabled）
yulabu 站点 server_name 须含 yulabu.cn www.yulabu.cn blog.yulabu.cn，均指向 frontend/home/dist
两站均：/api/、/uploads/ 反代 127.0.0.1:3000；try_files ... /index.html（History 路由）；gzip；静态资源缓存 30d
HTTPS：certbot 自动改写配置，HTTP 重定向到 HTTPS
常用维护命令
# 更新代码并重启
cd /var/www/yulabu_blog && git pull
cd frontend/home && npm install && npm run build   # 前台有变更时
cd frontend/admin && npm install && npm run build  # 后台有变更时
cd server && npm install                            # 后端新增依赖时（如 icojs）
pm2 restart blog-server                            # 后端有变更时

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
- 对外 OG 与友链自抓取统一用 blog.yulabu.cn：服务器本机 yulabu.cn 解析失败（hairpin/DNS），blog 子域终端验证可通；改 frontend/home/index.html 的 OG 标签后必须重 npm run build（home），否则 dist/index.html 不更新（实踩）
- blog.yulabu.cn 须出现在 Nginx server_name 且指向 frontend/home/dist，部署前确认（曾不确定是否配置）
- 必须使用项目 engines 指定的 Node LTS（^22.18.0 或 >=24.12.0），生产服务器为 Node 22.23.2 / npm 10.9.8；Windows 本地若用 Node 25（奇数版）/ npm 11，peer dependency 解析会异常，导致 `@vue/devtools-api`、echarts 等包缺包，前端报 `Failed to resolve import`（实踩）。解决：本地切到 Node 22/24 LTS，或在 package.json dependencies 显式补齐 peer dep
- 初始管理员账号密码来自 server/.env 的 SEED_ADMIN_NAME/PASSWORD，上线后应已修改
- 部署暂未写入仓库的 deploy/ 目录，后续可考虑固化

## 开发惯例
### 1. 部署流程
- 改动须先提交 git，服务器拉取：cd /var/www/yulabu_blog && git pull
- 前端变更：cd frontend/home && npm install && npm run build（前台）/ cd frontend/admin && npm install && npm run build（后台）
- 后端依赖变动：cd server && npm install；之后 pm2 restart blog-server
- Nginx 变更：nginx -t && systemctl reload nginx
- 本地改动先 npm run build 验证（含 vue-tsc 类型检查）再提交
- 服务器 1G 内存，禁用无头浏览器截图（puppeteer/playwright 等）

### 2. 数据库迁移
- sequelize.sync() 仅建表（表不存在时），不会 ALTER 已有表 / 追加 ENUM 值
- 新增字段或 ENUM 值必须手动 ALTER，或跑 server/scripts/sync-schema.js（幂等、可重复执行）；涉及图片引用结构的变更还需跑 migrate-image-ref.js（见第 4 节）
- 上线前自查：新模型字段 / 新 ENUM 值是否已在生产库存在
- ENUM 追加新值必须放末尾（MySQL 按索引存储，插前面会让存量数据错位，见 models/Post.js:40）
- 连接用 blog_user@localhost（utf8mb4）；root 走 unix_socket，不可密码登录

### 3. 域名与对外链接
- 对外分享 / 友链自抓取统一用 blog.yulabu.cn：服务器本机 yulabu.cn 解析失败（hairpin/DNS 问题），blog 子域终端验证可通
- frontend/home/index.html 的 og:url / og:image 必须指向可抓的有效域名（blog 子域），否则微信/QQ 卡片与友链抓图失败
- 改 OG 标签后必须重 npm run build（home），否则 dist/index.html 不更新

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
- 加载体验：首页 TopProgressBar + LoadingOverlay 双加载；admin 登录页预加载遮罩
- API 调用统一走 src/api/*，异步动作包 useAsyncAction

### 7. 本地环境坑
- PowerShell/bash 中 $Code 须反引号转义：E:\`$Code\...，否则路径展开为空
- 本地 Node fetch 走不了代理，github.com / yulabu.cn 等本地 fetch failed 属正常，生产服务器直连正常
- Node 22 必须 NodeSource；Debian 自带 Node 18 缺 npm 会构建失败
- 本地 Windows 务必使用 Node 22/24 LTS（项目 engines 要求 ^22.18.0 或 >=24.12.0）。Node 25（奇数版）/ npm 11 会导致 peer dependency 解析异常，拉取最新代码后前端报 `Failed to resolve import`（实踩 `@vue/devtools-api`、`echarts/core` 缺包）。解决：① 切到 Node 22/24 LTS；② 或在 package.json dependencies 显式补齐 peer dep；③ 或删 `node_modules` + `package-lock.json` 重 `npm install`
- package-lock.json 与 package.json 不同步会导致 npm ci 失败，用 npm install 重生成后提交 lock

### 8. 验证方式
- 后端 DTO 可直接：node -e "require('module-alias/register'); require('dotenv').config(); const {...}=require('@dto/...')" 验证
- 前端以 npm run build 通过（含类型检查）为门槛
- 业务改动建议生产实跑：curl -I https://blog.yulabu.cn/og-image.jpg、pm2 logs --err

### 9. 备份系统（2026-09）
- 结构：cron（/etc/cron.d/blog-backup，每天 04:00）→ server/scripts/backup.js（CLI 壳）→ server/utils/backup.js（核心，controller 共用）；产物在 <仓库根>/backups/（db/ 存 dump 保留 BACKUP_KEEP=30 份，uploads/ 为 rsync 镜像，排除 .tmp）；配置在 server/config/backup.js，git 已忽略 /backups
- dump 命令自动探测：mariadb-dump（生产）→ mysqldump（macOS brew）；凭据经临时 defaults-extra-file（chmod 600）传入，MySQL 系 dump 追加 --set-gtid-purged=OFF（向启用 GTID 的库导入会报错，实踩）；产物 <1KB 视为失败删除
- 后台「备份管理」页（/admin/backups）：列表 / 立即备份 / 导出完整包 / 删除 dump；接口挂在 adminRoutes.js（GET·POST /admin/backups、GET /admin/backups/:filename/export 流式下载、DELETE）；文件名白名单 ^blog-\d{8}-\d{6}\.sql\.gz$ 防路径穿越；备份与导出经 backups/.lock 文件锁跨进程互斥（wx 原子创建，PID+时间戳，重复触发 409，残留超 30 分钟自动接管；cron 与 pm2 是两个进程，模块级变量防不住跨进程，实改为文件锁）
- 导出包 = dump + 最新 uploads 镜像 + restore.sh（MYSQL_PWD 传密码，空密码不退化成交互提示，实踩）+ README-恢复说明.txt；**不含 server/.env**（迁移单独 scp）；打包前检查磁盘剩余空间（不足 507）
- 前端下载用 http.get<Blob> + responseType:'blob' + timeout:0（http.ts 全局 15s 超时会掐断备份/导出，实踩）；http.ts 响应拦截器已支持解析 blob 错误体中的 JSON message
- 恢复/迁移完整步骤见 deploy/backup.md（含异机迁移 checklist 与 cron 内容）；本地开发无 uploads 目录时镜像步骤告警跳过

