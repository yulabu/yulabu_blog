# 数据库与图片备份 / 恢复 / 迁移指南

> 备份系统于 2026-09 上线：每日自动备份数据库与 uploads 图片，后台（admin.yulabu.cn → 备份管理）可手动备份与导出完整恢复包。

## 1. 备份机制

| 项 | 值 |
|---|---|
| 备份内容 | 数据库全量逻辑导出（mariadb-dump）+ `uploads/` 图片 rsync 增量镜像 |
| 存放位置 | `/var/www/yulabu_blog/backups/`（`db/` 存 dump，`uploads/` 存镜像） |
| 自动执行 | `/etc/cron.d/blog-backup`：每天 04:00，日志 `/var/log/blog-backup.log` |
| 保留策略 | dump 保留最近 30 份（`BACKUP_KEEP` 可调），镜像恒为最新一份 |
| 核心代码 | `server/utils/backup.js`（逻辑）；`server/scripts/backup.js`（cron CLI 壳） |
| 配置 | `server/config/backup.js`，env 可覆盖 `BACKUP_DIR` / `BACKUP_KEEP` |

- dump 文件名：`blog-YYYYMMDD-HHmmss.sql.gz`，导出后校验大小（<1KB 视为失败并删除）。
- 备份与导出互斥：经 `backups/.lock` 文件锁跨进程互斥（cron 备份、后台「立即备份」、后台「导出」同时只会跑一个，重复触发返回 409；锁残留超 30 分钟视为进程崩溃，自动接管）。
- 本地开发：dump 工具自动探测 `mariadb-dump`（生产）→ `mysqldump`（macOS brew）；MySQL 系的 dump 自动加 `--set-gtid-purged=OFF`，向已启用 GTID 的库导入不会报错。
- 磁盘占用：≈ 图片总体积（镜像）+ 30 份 dump（个人博客一般几 MB）。导出打包前会检查剩余磁盘空间（不足返回 507）。

## 2. 后台操作（admin.yulabu.cn → 备份管理）

- **立即备份**：等同 cron 手动触发，完成后列表刷新。
- **导出**：下载 `blog-backup-*.tar.gz` 完整恢复包，内含：
  - `db/blog-*.sql.gz` 数据库 dump
  - `uploads/` 图片镜像（导出前自动增量刷新，与站点一致）
  - `restore.sh` 数据库一键导入脚本（Linux/macOS，交互式输入连接信息）
  - `README-恢复说明.txt` 恢复/迁移步骤
  - **注意：包内不含 `server/.env`**（含 JWT 密钥，不进备份包，迁移时单独取回）。
- **删除**：删除指定 dump（镜像不受影响）。

## 3. API（均在 /api/admin/* 下，需登录）

```
GET    /api/admin/backups                      # 列表 + 镜像统计
POST   /api/admin/backups                      # 立即备份
GET    /api/admin/backups/:filename/export     # 导出完整包（tar.gz 流式下载）
DELETE /api/admin/backups/:filename            # 删除指定 dump
```
filename 白名单：`^blog-\d{8}-\d{6}\.sql\.gz$`（防路径穿越）。

## 4. 日常运维命令

```bash
# 手动触发一次备份
cd /var/www/yulabu_blog/server && node scripts/backup.js

# 查看备份产物与日志
ls -lh /var/www/yulabu_blog/backups/db/
tail /var/log/blog-backup.log

# 校验某份 dump 完整性
gzip -t /var/www/yulabu_blog/backups/db/blog-*.sql.gz
```

### 异地容灾（重要）

服务器磁盘/整机故障时本地备份会一起丢失，**建议每月把最新备份包拉回自己电脑**：
后台「导出」下载，或命令行：

```bash
# 在自己电脑上执行（最新一份完整包需先在后台导出；以下为拉取 dump 的简化方式）
scp root@206.237.13.114:/var/www/yulabu_blog/backups/db/blog-*.sql.gz ~/blog-backups/
# 图片镜像（增量，首次全量）
rsync -av root@206.237.13.114:/var/www/yulabu_blog/backups/uploads/ ~/blog-backups/uploads/
```

## 5. 恢复到原服务器（数据库出问题时）

1. 后台导出最新备份包并上传到服务器（或直接用服务器上的 `backups/`）。
2. 导入数据库（推荐走包内脚本，交互输入连接信息，生产参数见 `server/.env` 的 `DB_*`）：
   ```bash
   mkdir /tmp/restore && tar xzf blog-backup-*.tar.gz -C /tmp/restore && cd /tmp/restore
   ./restore.sh
   # 等价手动操作：
   # gzip -dc db/blog-*.sql.gz | mysql -u blog_user -p blog
   ```
3. 图片通常无需处理；若也丢失：`rsync -a /tmp/restore/uploads/ /var/www/yulabu_blog/uploads/`
4. `pm2 restart blog-server`，打开前台与后台验证文章/图片/日记正常。

## 6. 迁移到全新服务器（完整 checklist）

前置：域名解析切到新机 IP；新机为 Debian 12（其他发行版自行替换包管理命令）。

1. **装基础软件**：Node 22 必须用 NodeSource（apt 直装会得到缺 npm 的 Node 18）：
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
   apt install -y mariadb-server nginx rsync
   npm i -g pm2
   ```
2. **拉代码**：`git clone <仓库地址> /var/www/yulabu_blog`
3. **建库建号**（MariaDB root 走 unix_socket：`sudo mariadb` 进入）：
   ```sql
   CREATE DATABASE blog CHARACTER SET utf8mb4;
   CREATE USER 'blog_user'@'localhost' IDENTIFIED BY '强密码';
   GRANT ALL PRIVILEGES ON blog.* TO 'blog_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
4. **写配置**：从旧服务器取回 `server/.env`（`scp root@旧机IP:/var/www/yulabu_blog/server/.env ...`），核对 `DB_PASSWORD` 与第 3 步一致。
5. **导数据**：解压备份包（后台导出或 scp 拉取），在包根目录 `./restore.sh`（输入 blog_user 的信息）。
6. **恢复图片**：`rsync -a 包目录/uploads/ /var/www/yulabu_blog/uploads/`
7. **起后端**：`cd /var/www/yulabu_blog/server && npm install && pm2 start app.js --name blog-server && pm2 save && pm2 startup`
8. **建前端**：`cd ../frontend/home && npm install && npm run build`；admin 同理。
9. **配 Nginx**：复制旧机 `/etc/nginx/sites-available/yulabu` 与 `yulabu-admin`（软链到 sites-enabled），其中 admin 站点的 `/api/` location 应含 `proxy_read_timeout 300s`（防大包导出超时）；`certbot --nginx -d yulabu.cn -d www.yulabu.cn -d blog.yulabu.cn` 与 admin 域名同理签证书。
10. **装 cron**：写入 `/etc/cron.d/blog-backup`（root 属主，0644）：
    ```
    0 4 * * * root cd /var/www/yulabu_blog/server && /usr/bin/node scripts/backup.js >> /var/log/blog-backup.log 2>&1
    ```
11. **验证**：`curl -I https://yulabu.cn/`；登录后台核对文章/图片/日记/友链数量；跑一次「立即备份」。

## 7. 说明与边界

- dump 为 SQL 文本逻辑导出，同版本或更高版本的 MySQL / MariaDB 可导入；`restore.sh` 会覆盖目标库，执行前确认。
- 备份包不含代码（git 仓库本身即可恢复）、不含 `.env`、不含 Nginx 配置与证书——迁移时按第 6 节单独处理。
- 修改保留份数 / 备份目录：`server/.env` 加 `BACKUP_KEEP=60` / `BACKUP_DIR=...`，`pm2 restart blog-server` 后生效（CLI 与接口共用该配置）。
