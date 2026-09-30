// 导出包随包附带的文本资产：恢复脚本与恢复说明。
// 单独成文件是因为它们是"给人看的成品内容"（改文案=改这里），不该混在 dump/流式逻辑里。
// 注意 RESTORE_SH 是 shell 单引号/引号都敏感的文本，改动后务必跑一次导出并解包执行验证。

const RESTORE_SH = `#!/bin/sh
# Yulabu Blog 数据库恢复脚本（配合包内 db/*.sql.gz 使用）
# 用法：解压备份包后，在本包根目录执行 ./restore.sh
set -e

DUMP_FILE=$(ls db/*.sql.gz 2>/dev/null | head -n 1)
if [ -z "$DUMP_FILE" ]; then
  echo "未找到 db/*.sql.gz，请在解压后的备份包根目录执行本脚本"
  exit 1
fi

printf '数据库地址 [127.0.0.1]: '
read DB_HOST
printf '端口 [3306]: '
read DB_PORT
printf '用户名 [root]: '
read DB_USER
printf '密码: '
if [ -t 0 ]; then stty -echo; fi
read DB_PASSWORD
if [ -t 0 ]; then stty echo; fi
echo ''
printf '库名 [blog]: '
read DB_NAME
DB_HOST=\${DB_HOST:-127.0.0.1}
DB_PORT=\${DB_PORT:-3306}
DB_USER=\${DB_USER:-root}
DB_NAME=\${DB_NAME:-blog}

echo ''
echo "即将把 $DUMP_FILE 导入 \${DB_USER}@\${DB_HOST}:\${DB_PORT}/\${DB_NAME}"
echo '注意：若目标库已有数据会被覆盖！'
printf '确认请输入 yes: '
read CONFIRM
if [ "$CONFIRM" != "yes" ]; then echo '已取消'; exit 1; fi

echo '创建数据库（如不存在）...'
# 密码经 MYSQL_PWD 传入：为空时不会退化成交互式提示
MYSQL_PWD="$DB_PASSWORD" mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \\
  -e "CREATE DATABASE IF NOT EXISTS \\\`$DB_NAME\\\` CHARACTER SET utf8mb4"

echo '导入数据中，请稍候...'
gzip -dc "$DUMP_FILE" | MYSQL_PWD="$DB_PASSWORD" mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME"

echo '数据库导入完成。图片目录恢复与后续步骤见 README-恢复说明.txt'
`;

const README_TXT = `【包内容】
  db/blog-*.sql.gz   数据库完整导出（MariaDB 逻辑备份，gzip 压缩）
  uploads/           全部文章/日记/图片库图片（导出时与站点一致）
  restore.sh         数据库一键导入脚本（Linux / macOS 可用）
  本说明文件

注意：本包不包含 server/.env（含 JWT 密钥与数据库密码，不进备份包）。
迁移时请通过 scp 从原服务器 /var/www/yulabu_blog/server/.env 单独取回。

【情况 A：恢复到原服务器（数据库出问题时）】
  1. 上传本包到服务器并解压：mkdir /tmp/restore && tar xzf blog-backup-*.tar.gz -C /tmp/restore
  2. 在解压目录执行 ./restore.sh，按提示输入数据库信息
     （生产连接参数见 /var/www/yulabu_blog/server/.env 的 DB_* 各项）
  3. 图片一般无需处理（服务器 uploads/ 未损坏时）；若图片也丢失：
     rsync -a uploads/ /var/www/yulabu_blog/uploads/
  4. 重启服务：pm2 restart blog-server
  5. 验证：打开前台与后台，检查文章、图片、日记显示正常

【情况 B：迁移到全新服务器】
  1. 安装 Node.js 22（NodeSource 源）、MariaDB 10.11+、Nginx、rsync，并 npm i -g pm2
  2. 拉取代码：git clone <你的仓库地址> /var/www/yulabu_blog
  3. 从原服务器取回配置文件：/var/www/yulabu_blog/server/.env
  4. 以 root 登录 MariaDB 建库建号：
     CREATE DATABASE blog CHARACTER SET utf8mb4;
     CREATE USER 'blog_user'@'localhost' IDENTIFIED BY '你的密码';
     GRANT ALL PRIVILEGES ON blog.* TO 'blog_user'@'localhost';
     FLUSH PRIVILEGES;
     （并把密码同步写进 server/.env 的 DB_PASSWORD）
  5. 解压本包，在包根目录执行 ./restore.sh（输入上一步的账号信息）
  6. 恢复图片：rsync -a uploads/ /var/www/yulabu_blog/uploads/
  7. 启动后端：cd /var/www/yulabu_blog/server && npm install && pm2 start app.js --name blog-server && pm2 save
  8. 构建前端：cd /var/www/yulabu_blog/frontend/home && npm install && npm run build
     （后台同理：cd frontend/admin && npm install && npm run build）
  9. 配置 Nginx 反代（参考 /etc/nginx/sites-available/yulabu 与 yulabu-admin，仓库 deploy/backup.md 有说明）
  10. 验证：curl -I https://你的域名/ ，登录后台检查文章/图片/评论数据完整

【说明】
  - dump 为逻辑导出（SQL 文本），导入同版本或更高版本的 MySQL / MariaDB 均可
  - restore.sh 会覆盖目标库已有数据，执行前请确认目标库可覆盖
  - 若目标机没有 mysql 命令，用 mariadb 命令等价替换 restore.sh 中的 mysql 即可
`;

module.exports = { RESTORE_SH, README_TXT }
