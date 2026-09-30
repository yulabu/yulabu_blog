// 备份核心：dump 数据库 + 刷新 uploads 镜像 + 清理过期 dump + 列表 / 删除。
// 不认识 HTTP（导出打包在 export.js，响应管道在 controllers/backupController.js）。
// 消费者两条路：cron/手工 CLI（scripts/backup.js）与后台按钮（backupController）——
// 所以互斥锁、阈值、报错都在这层，不在各自的调用方各写一遍。
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const { spawn, execFile } = require('child_process');
const AppError = require('@errors/AppError');
const { UPLOAD_DIR } = require('@config/image');
const { BACKUP_KEEP } = require('@config/backup');
const { dbConfig } = require('@config/database');
const { BACKUP_DIR, DB_BACKUP_DIR, UPLOADS_MIRROR_DIR, DUMP_FILE_RE } = require('@services/backup/layout');
const { acquireLock, releaseLock } = require('@services/backup/lock');

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

// 凭据经 defaults-extra-file 传入（必须是第一个参数），避免密码出现在进程命令行。
// 值只从 dbConfig 取——与应用连的是同一份参数（改前这里自己读 env 并自带默认值，
// 缺 DB_NAME 时应用起不来、dump 却会静默去备一个叫 'blog' 的库）
async function writeDefaultsExtraFile() {
  const cnfPath = path.join(os.tmpdir(), `blog-dump-${process.pid}-${Date.now()}.cnf`);
  const content = [
    '[client]',
    `host=${dbConfig.host}`,
    `port=${dbConfig.port}`,
    `user=${dbConfig.user}`,
    `password=${dbConfig.password}`,
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
      dbConfig.name
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
    // 这个临时 cnf 里含数据库账号密码（建时 chmod 600）：删除失败必须留痕，
    // 否则凭据可能静默留在磁盘上而无人知道
    await fsp.unlink(cnfPath).catch((err) => {
      if (err.code !== 'ENOENT') {
        console.error(`[backup] 临时凭据文件删除失败（内含 DB 凭据，请手工删除）: ${cnfPath} :: ${err.message}`);
      }
    });
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

module.exports = {
  runBackup,
  listBackups,
  deleteDump,
  // 导出打包（export.js）复用的原语
  dumpDatabase,
  syncUploadsMirror,
  walkStats,
  freeDiskBytes
};
