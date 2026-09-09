const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const { spawn, execFile } = require('child_process');
const AppError = require('@middleware/AppError');
const { UPLOAD_DIR } = require('@config/image');
const { BACKUP_DIR, BACKUP_KEEP } = require('@config/backup');

// 备份布局：<BACKUP_DIR>/db/blog-*.sql.gz + <BACKUP_DIR>/uploads/（rsync 镜像）
// 导出包时会在 BACKUP_DIR 根下生成 restore.sh 与 README-恢复说明.txt 一并打包
const DB_BACKUP_DIR = path.join(BACKUP_DIR, 'db');
const UPLOADS_MIRROR_DIR = path.join(BACKUP_DIR, 'uploads');
// dump 文件名白名单，同时防路径穿越
const DUMP_FILE_RE = /^blog-\d{8}-\d{6}\.sql\.gz$/;

// 跨进程互斥锁：cron CLI 与 pm2 服务是两个进程，模块级变量不共享，
// 用 BACKUP_DIR/.lock（PID+时间戳）做文件锁；超时视为进程崩溃残留，强制接管
const LOCK_PATH = path.join(BACKUP_DIR, '.lock');
const LOCK_STALE_MS = 30 * 60 * 1000;

async function acquireLock() {
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  // wx = O_EXCL 原子创建，并发时只有一个进程成功
  try {
    await fsp.writeFile(LOCK_PATH, `${process.pid} ${Date.now()}`, { flag: 'wx' });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const raw = await fsp.readFile(LOCK_PATH, 'utf8').catch(() => '');
    const ts = Number(String(raw).trim().split(' ')[1]);
    if (Number.isFinite(ts) && Date.now() - ts < LOCK_STALE_MS) {
      throw new AppError(409, '备份/导出任务进行中，请稍后再试');
    }
    // 死锁接管：删残留锁重试一次；wx 保证多个进程同时接管时只有一个成功
    await fsp.unlink(LOCK_PATH).catch(() => {});
    await fsp.writeFile(LOCK_PATH, `${process.pid} ${Date.now()}`, { flag: 'wx' });
  }
}

async function releaseLock() {
  await fsp.unlink(LOCK_PATH).catch(() => {});
}

function formatStamp(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function binVersion(bin) {
  return new Promise(resolve => {
    const p = spawn(bin, ['--version']);
    let out = '';
    p.stdout.on('data', d => { out += d.toString(); });
    p.on('error', () => resolve(null));
    p.on('close', code => resolve(code === 0 ? out : null));
  });
}

// 生产是 mariadb-dump；本地（macOS brew）只有 mysqldump。二者参数基本兼容，
// 但 MySQL 系的 dump 会写入 SET @@GLOBAL.GTID_PURGED，向已启用 GTID 的库导入会报错，
// 需追加 --set-gtid-purged=OFF；MariaDB 系（含 Debian 的 mysqldump 软链）不加
async function resolveDumpBin() {
  for (const bin of ['mariadb-dump', 'mysqldump']) {
    const version = await binVersion(bin);
    if (version !== null) {
      return { bin, isMysql: !/mariadb/i.test(version) };
    }
  }
  throw new AppError(500, '未找到 mariadb-dump / mysqldump，请先安装 mariadb-client');
}

// 凭据经 defaults-extra-file 传入（必须是第一个参数），避免密码出现在进程命令行
async function writeDefaultsExtraFile() {
  const cnfPath = path.join(os.tmpdir(), `blog-dump-${process.pid}-${Date.now()}.cnf`);
  const content = [
    '[client]',
    `host=${process.env.DB_HOST || '127.0.0.1'}`,
    `port=${process.env.DB_PORT || '3306'}`,
    `user=${process.env.DB_USER || 'root'}`,
    `password=${process.env.DB_PASSWORD || ''}`,
    ''
  ].join('\n');
  await fsp.writeFile(cnfPath, content, { mode: 0o600 });
  return cnfPath;
}

// 后台命令执行：非 0 退出码抛错并携带 stderr 末尾（报错根因通常在最后几行）
function runCommand(bin, args, label) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args);
    let stderr = '';
    p.stderr.on('data', d => { stderr += d.toString(); });
    p.on('error', reject);
    p.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${label}失败（退出码 ${code}）：${stderr.trim().slice(-500)}`));
    });
  });
}

// 导出数据库：mariadb-dump 流式经 gzip 落盘，产物过小视为失败并清理
async function dumpDatabase() {
  await fsp.mkdir(DB_BACKUP_DIR, { recursive: true });
  const { bin, isMysql } = await resolveDumpBin();
  const filename = `blog-${formatStamp(new Date())}.sql.gz`;
  const outPath = path.join(DB_BACKUP_DIR, filename);
  const cnfPath = await writeDefaultsExtraFile();
  let stderr = '';
  try {
    const args = [
      `--defaults-extra-file=${cnfPath}`,
      '--single-transaction',
      '--quick',
      '--default-character-set=utf8mb4',
      ...(isMysql ? ['--set-gtid-purged=OFF'] : []),
      process.env.DB_NAME || 'blog'
    ];
    await new Promise((resolve, reject) => {
      const dump = spawn(bin, args);
      const gzip = zlib.createGzip();
      const out = fs.createWriteStream(outPath);
      dump.stderr.on('data', d => { stderr += d.toString(); });
      dump.on('error', reject);
      gzip.on('error', reject);
      out.on('error', reject);
      dump.stdout.pipe(gzip).pipe(out);
      out.on('finish', resolve);
    });
    const stat = await fsp.stat(outPath);
    // 连表结构都没有的空导出也有几百字节；<1KB 说明导出根本没成功（如账号密码错误）
    if (stat.size < 1024) {
      throw new AppError(500, `备份产物异常（仅 ${stat.size} 字节）：${stderr.trim().slice(-300) || '导出为空'}`);
    }
    return { filename, size: stat.size };
  } catch (e) {
    await fsp.unlink(outPath).catch(() => {});
    throw e;
  } finally {
    await fsp.unlink(cnfPath).catch(() => {});
  }
}

// uploads 镜像：rsync 增量同步（磁盘占用恒定为图片总体积）；目录不存在仅告警跳过（本地开发环境）
async function syncUploadsMirror() {
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  await fsp.mkdir(UPLOADS_MIRROR_DIR, { recursive: true });
  try {
    await fsp.access(UPLOAD_DIR);
  } catch {
    console.warn(`[backup] 上传目录不存在，跳过图片镜像: ${UPLOAD_DIR}`);
    return;
  }
  // --exclude 掉 multer 临时目录，尾部斜杠表示同步目录内容；
  // rsync -a 会让镜像目录 mtime 跟随源目录，同步完成后主动 touch 作为「最近同步时间」标记
  await runCommand('rsync', ['-a', '--delete', '--exclude=.tmp', `${UPLOAD_DIR}/`, `${UPLOADS_MIRROR_DIR}/`], '镜像 uploads ');
  const now = new Date();
  await fsp.utimes(UPLOADS_MIRROR_DIR, now, now);
}

// 按文件名（即时间序）清理超出保留份数的旧 dump
async function pruneOldBackups() {
  const files = (await fsp.readdir(DB_BACKUP_DIR)).filter(f => DUMP_FILE_RE.test(f)).sort();
  const excess = files.length - BACKUP_KEEP;
  for (const f of files.slice(0, Math.max(excess, 0))) {
    await fsp.unlink(path.join(DB_BACKUP_DIR, f)).catch(() => {});
    console.log(`[backup] 已清理过期备份: ${f}`);
  }
}

// 执行一次完整备份：dump 数据库 + 刷新 uploads 镜像 + 清理过期；返回本次备份信息
async function runBackup() {
  await acquireLock();
  try {
    const info = await dumpDatabase();
    await syncUploadsMirror();
    await pruneOldBackups();
    return info;
  } finally {
    await releaseLock();
  }
}

async function walkStats(dir) {
  let count = 0;
  let totalSize = 0;
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await walkStats(p);
      count += sub.count;
      totalSize += sub.totalSize;
    } else if (entry.isFile()) {
      count += 1;
      totalSize += (await fsp.stat(p)).size;
    }
  }
  return { count, totalSize };
}

// 备份列表 + uploads 镜像统计（后台管理页展示用）
async function listBackups() {
  const backups = [];
  try {
    for (const f of (await fsp.readdir(DB_BACKUP_DIR)).filter(f => DUMP_FILE_RE.test(f))) {
      const stat = await fsp.stat(path.join(DB_BACKUP_DIR, f));
      backups.push({ filename: f, size: stat.size, createdAt: stat.mtime });
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  backups.sort((a, b) => b.filename.localeCompare(a.filename));

  let uploads = { fileCount: 0, totalSize: 0, syncedAt: null };
  try {
    // syncedAt 读镜像目录 mtime（syncUploadsMirror 在每次 rsync 后 touch 更新）
    const mirrorStat = await fsp.stat(UPLOADS_MIRROR_DIR);
    const stats = await walkStats(UPLOADS_MIRROR_DIR);
    uploads = { fileCount: stats.count, totalSize: stats.totalSize, syncedAt: mirrorStat.mtime };
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  return { backups, uploads };
}

function freeDiskBytes() {
  return new Promise((resolve, reject) => {
    execFile('df', ['-k', BACKUP_DIR], (err, stdout) => {
      if (err) return reject(err);
      const line = stdout.trim().split('\n').pop();
      const availKB = Number(line.trim().split(/\s+/)[3]);
      if (!Number.isFinite(availKB)) return reject(new Error('df 输出解析失败'));
      resolve(availKB * 1024);
    });
  });
}

// 生成导出包附带的恢复脚本与说明（每次导出覆盖写入）
async function writeExportAssets() {
  const header = `========================================\n Yulabu Blog 完整备份包\n 生成时间：${new Date().toLocaleString('zh-CN')}\n========================================\n`;
  await fsp.writeFile(path.join(BACKUP_DIR, 'restore.sh'), RESTORE_SH, { mode: 0o755 });
  await fsp.writeFile(path.join(BACKUP_DIR, 'README-恢复说明.txt'), header + README_TXT);
}

// 导出完整备份包：指定 dump + 最新 uploads 镜像 + restore.sh + 恢复说明，tar.gz 流式输出到响应
async function streamExportBackup(filename, res) {
  if (!DUMP_FILE_RE.test(filename)) throw new AppError(400, '非法的备份文件名');
  const dumpPath = path.join(DB_BACKUP_DIR, filename);
  let dumpSize;
  try {
    dumpSize = (await fsp.stat(dumpPath)).size;
  } catch (e) {
    if (e.code === 'ENOENT') throw new AppError(404, '备份不存在或已被清理');
    throw e;
  }
  await acquireLock();
  try {
    // 打包前先增量刷新一次镜像，保证包内图片与站点当前一致
    await syncUploadsMirror();
    await writeExportAssets();

    // 粗略预估包体积：webp 本身已压缩，tar.gz ≈ 原体积；预留 128MB 余量
    const { totalSize } = await walkStats(UPLOADS_MIRROR_DIR);
    const free = await freeDiskBytes().catch(() => Number.POSITIVE_INFINITY);
    const needBytes = totalSize + dumpSize + 128 * 1024 * 1024;
    if (free < needBytes) {
      throw new AppError(507, `磁盘剩余空间不足（打包约需 ${Math.round((totalSize + dumpSize) / 1024 / 1024)}MB），导出已取消`);
    }

    const downloadName = `blog-backup-${filename.replace(/\.sql\.gz$/, '')}.tar.gz`;
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    await new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-czf', '-', '-C', BACKUP_DIR, `db/${filename}`, 'uploads', 'README-恢复说明.txt', 'restore.sh']);
      let stderr = '';
      let clientGone = false;
      res.on('close', () => { clientGone = true; }); // 用户取消下载等
      tar.stderr.on('data', d => { stderr += d.toString(); });
      tar.on('error', reject);
      tar.stdout.pipe(res);
      tar.on('close', code => {
        if (clientGone) return resolve();
        if (code === 0) return resolve();
        const err = new AppError(500, `打包失败：${stderr.trim().slice(-300)}`);
        if (res.headersSent) res.destroy(); // 头部已发出，只能中断连接
        reject(err);
      });
    });
  } finally {
    await releaseLock();
  }
}

// 删除指定 dump 文件
async function deleteDump(filename) {
  if (!DUMP_FILE_RE.test(filename)) throw new AppError(400, '非法的备份文件名');
  try {
    await fsp.unlink(path.join(DB_BACKUP_DIR, filename));
  } catch (e) {
    if (e.code === 'ENOENT') throw new AppError(404, '备份不存在或已被清理');
    throw e;
  }
}

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

module.exports = { runBackup, listBackups, streamExportBackup, deleteDump, DUMP_FILE_RE };
