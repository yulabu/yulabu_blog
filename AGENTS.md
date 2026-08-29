## 施工约定
- 方案初步设计时，遵循现有项目结构和风格，设计对应方案
- 迭代更新时，需考虑对目前部署到生产环境数据库的影响
## Yulabu Blog 生产部署环境
服务器
项	值
系统	Debian 12 (bookworm)，xanmod 内核 6.12.67
IP	206.237.13.114（境外，免备案）
登录	SSH root
域名
域名	用途	解析
yulabu.cn + www.yulabu.cn	博客前台	A → 206.237.13.114
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
│   ├── app.js             # PM2 入口 (name: blog-server)
│   ├── .env               # 环境变量（数据库/密钥/上传目录/seed）
│   └── seed.js            # 管理员创建（读 .env 的 SEED_ADMIN_*）
├── frontend/
│   ├── home/dist/         # 主站静态产物（yulabu.cn）
│   └── admin/dist/        # 后台静态产物（admin.yulabu.cn）
└── uploads/               # 文章图片（UPLOAD_DIR=/var/www/yulabu_blog/uploads）
数据库
库：blog（utf8mb4）
账号：blog_user@localhost（仅本机，bind-address=127.0.0.1）
表由后端启动时 sequelize.sync() 自动创建
Nginx
站点文件：/etc/nginx/sites-available/yulabu 与 yulabu-admin（已软链到 sites-enabled）
两站均：/api/、/uploads/ 反代 127.0.0.1:3000；try_files ... /index.html（History 路由）；gzip；静态资源缓存 30d
HTTPS：certbot 自动改写配置，HTTP 重定向到 HTTPS
常用维护命令
# 更新代码并重启
cd /var/www/yulabu_blog && git pull
cd frontend/home && npm install && npm run build   # 前台有变更时
cd frontend/admin && npm install && npm run build  # 后台有变更时
pm2 restart blog-server                            # 后端有变更时

# 查看日志
pm2 logs blog-server
# 证书续期（已配置定时任务，一般无需手动）
certbot renew --dry-run
注意事项
- 服务器预装 xanmod 内核，其 apt 源 deb.xanmod.org 已失效（404），已在 /etc/apt/sources.list.d/xanmod-kernel.list 中注释；若 apt update 报错请检查该源
- Node 22 必须用 NodeSource 安装；若 apt 源异常，会静默装成 Debian 自带 Node 18（缺 npm），导致前端构建失败（engines 要求 ^22.18.0）
- Debian 12 无 mysql-server 包，数据库用 mariadb-server（与 mysql2 兼容）
- 数据库连接必须用 blog_user@localhost；MariaDB 的 root 默认走 unix_socket 认证，无法用密码登录
- frontend 的 package-lock.json 与 package.json 曾不同步导致 npm ci 失败，需用 npm install 重生成后提交 lock
- 初始管理员账号密码来自 server/.env 的 SEED_ADMIN_NAME/PASSWORD，上线后应已修改
- 部署暂未写入仓库的 deploy/ 目录，后续可考虑固化
