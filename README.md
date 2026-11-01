# Yulabu Blog

个人博客全栈项目。

## 项目结构

```
yulabu_blog/
├── server/              # Express 5 + Sequelize 6 + MySQL/MariaDB 后端
├── frontend/
│   ├── home/            # 前台博客（Astro 7 群岛 + Vue 3 岛）
│   └── admin/           # 管理后台（Vue 3 + Vite + TypeScript）
├── deploy/              # 生产部署文档（Astro / 备份 / 数据库结构）
└── package.json         # 根脚本
```

## 一键启动

根目录已配置 `concurrently`，可同时启动后端 + 前端：

```bash
# 后端 + 博客前台（Astro dev，5174）
npm run dev:home

# 后端 + 管理后台（Vite，5175）
npm run dev:admin
```

默认访问地址：

| 服务 | 地址 |
|------|------|
| 博客前台 | `http://localhost:5174` |
| 管理后台 | `http://localhost:5175` |
| 后端 API | `http://localhost:3000` |

## 生产部署

生产环境清单、完整命令与踩坑记录以 [AGENTS.md](AGENTS.md) 和 [deploy/](deploy/) 为准；这里保留最小清单与 2026-10 的安全基线。

### 运行环境

| 项 | 生产值 |
|---|---|
| 系统 | Debian 12 (bookworm) |
| Node.js | **22.23.4**（≥22.23.4；不要降级） |
| npm | 10.9.9 |
| 数据库 | MariaDB 10.11（`blog_user@localhost`） |
| Web | Nginx 1.22.1 + Astro SSR（127.0.0.1:4321） |
| 进程 | PM2 7.0.3（systemd `pm2-root` 托管） |
| 证书 | Let's Encrypt / certbot 2.1.0 |
| 域名 | `yulabu.cn` / `www` / `blog` / `admin` |

### 部署路径（代码只走 GitHub）

```bash
# 本地
git push origin main

# 服务器
cd /var/www/yulabu_blog && git pull

# 前台 / 后台有变更时
cd /var/www/yulabu_blog/frontend/home && npm install && npm run build
cd /var/www/yulabu_blog/frontend/admin && npm install && npm run build

# 后端依赖有变更时
cd /var/www/yulabu_blog/server && npm install

# 重启应用（不要用 pm2 update）
pm2 restart blog-server blog-web

# Nginx 有变更时
sudo nginx -t && sudo systemctl reload nginx
```

> 禁止用 bundle / scp / 手工改服务器文件绕过 GitHub：旁路会让生产与仓库分叉，之后无法用 git 判断生产跑的哪一版。

### PM2 重启（2026-10 实踩）

**不要用 `pm2 update`**：实测会在停掉 `pm2-root` 后卡住，`blog-server` / `blog-web` 不会自动拉起。只重启应用用：

```bash
pm2 restart blog-server blog-web
```

需要重启 PM2 daemon / 恢复 systemd 托管时：

```bash
systemctl restart pm2-root
# 或
pm2 kill && systemctl start pm2-root
systemctl is-active pm2-root     # 期望 active
pm2 list                         # 期望 blog-server / blog-web online
```

### 系统信任库基线（2026-10 eMudhra 事件）

2026-10 eMudhra 中间 CA 私钥泄露，`emSign ECC Root CA - G3` 被 Mozilla/Chrome 移除，Sectigo 交叉签名证书也已吊销。生产已做：

- **Node ≥ 22.23.4**：bundled CA 只保留不受影响的 `emSign Root CA - G1`，不含 G3/C1/C3。
- **系统 CA**：`/etc/ca-certificates.conf` 已禁用 `emSign_ECC_Root_CA_-_G3` 与 `Comodo_AAA_Services_root`；当前 148 个 subject，G3/AAA 均不存在。

每次 `apt upgrade` 升级 `ca-certificates` 后必须复查：

```bash
openssl crl2pkcs7 -nocrl -certfile /etc/ssl/certs/ca-certificates.crt \
  | openssl pkcs7 -print_certs -noout \
  | grep -iE 'emSign ECC Root CA - G3|AAA Certificate Services' \
  && echo 'RE-ADDED: 重新禁用' || echo clean
```

Node 根库、证书续期与站点点检：

```bash
node -v                          # v22.23.4+
node -e 'const {X509Certificate}=require("crypto");const {rootCertificates}=require("tls");const a=rootCertificates.map(p=>new X509Certificate(p));console.log(process.version,a.length);console.log(a.filter(x=>/emSign/i.test(x.subject)).map(x=>x.subject.replace(/\n/g," | ")))'
certbot renew --dry-run
curl -sSI https://blog.yulabu.cn/ | head -3
pm2 list
```

更细的部署/回滚步骤：

- [AGENTS.md](AGENTS.md)：生产环境、部署流程、开发惯例
- [deploy/astro.md](deploy/astro.md)：前台 Astro、Nginx、PM2、日志与回滚
- [deploy/backup.md](deploy/backup.md)：备份 cron、恢复与异机迁移
- [deploy/schema.md](deploy/schema.md)：数据库结构基线与对账

## 文档

- 博客前台：[frontend/home/README.md](frontend/home/README.md)
- 管理后台：[frontend/admin/README.md](frontend/admin/README.md)
- 后端：[server/README.md](server/README.md)
