// 导出完整备份包：准备（刷新 uploads 镜像 + 生成恢复脚本/说明 + 磁盘余量检查）+ 起 tar 流。
// 这层不认识 HTTP：返回 { downloadName, stream, finished, notifyClientGone }，
// 响应头与 pipe 在 controller（媒体类型/下载文件名/连接中断都是传输层的事）。
// 互斥锁从准备一直持到 tar 结束：中途失败/客户端中断都必须释放，否则下一次备份会 409。
const fsp = require('fs').promises
const path = require('path')
const { spawn } = require('child_process')
const AppError = require('@errors/AppError')
const { BACKUP_DIR, DB_BACKUP_DIR, UPLOADS_MIRROR_DIR, DUMP_FILE_RE } = require('@services/backup/layout')
const { acquireLock, releaseLock } = require('@services/backup/lock')
const { syncUploadsMirror, walkStats, freeDiskBytes } = require('@services/backup/run')
const { RESTORE_SH, README_TXT } = require('@services/backup/assets')

// 生成导出包附带的恢复脚本与说明（每次导出覆盖写入）
async function writeExportAssets() {
  const header = `========================================\n Yulabu Blog 完整备份包\n 生成时间：${new Date().toLocaleString('zh-CN')}\n========================================\n`;
  await fsp.writeFile(path.join(BACKUP_DIR, 'restore.sh'), RESTORE_SH, { mode: 0o755 });
  await fsp.writeFile(path.join(BACKUP_DIR, 'README-恢复说明.txt'), header + README_TXT);
}

async function openExportArchive(filename) {
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
  let tar;
  try {
    // 打包前先增量刷新一次镜像，保证包内图片与站点当前一致
    await syncUploadsMirror();
    await writeExportAssets();

    // 粗略预估包体积：webp 本身已压缩，tar.gz ≈ 原体积；预留 128MB 余量
    const { totalSize } = await walkStats(UPLOADS_MIRROR_DIR);
    // df 失败被当成「磁盘无限大」会让下面那次余量检查静默失效（导出可能把盘写满）。
    // 留痕但仍放行：不因为测量失败就拒绝「导出备份」这个正常操作
    const free = await freeDiskBytes().catch((err) => {
      console.warn(`[backup] 读取磁盘余量失败，本次跳过空间检查：${err.message}`);
      return Number.POSITIVE_INFINITY;
    });
    const needBytes = totalSize + dumpSize + 128 * 1024 * 1024;
    if (free < needBytes) {
      throw new AppError(507, `磁盘剩余空间不足（打包约需 ${Math.round((totalSize + dumpSize) / 1024 / 1024)}MB），导出已取消`);
    }

    tar = spawn('tar', ['-czf', '-', '-C', BACKUP_DIR, `db/${filename}`, 'uploads', 'README-恢复说明.txt', 'restore.sh']);
  } catch (e) {
    await releaseLock();
    throw e;
  }

  const downloadName = `blog-backup-${filename.replace(/\.sql\.gz$/, '')}.tar.gz`;
  let stderr = '';
  let clientGone = false;

  const finished = new Promise((resolve, reject) => {
    tar.stderr.on('data', d => { stderr += d.toString(); });
    tar.on('error', (err) => {
      releaseLock();
      reject(err);
    });
    tar.on('close', (code) => {
      releaseLock();
      if (clientGone) return resolve();   // 用户取消下载：静默收尾，不算失败
      if (code === 0) return resolve();
      reject(new AppError(500, `打包失败：${stderr.trim().slice(-300)}`));
    });
  });
  // 调用方可能来不及接管（或在 pipe 阶段就断开）：先挂一个空处理器，避免未处理拒绝告警
  finished.catch(() => {});

  return {
    downloadName,
    stream: tar.stdout,
    finished,
    // 客户端断开时由 controller 调用：先标记「无人接收」，再结束打包进程。
    // 必须 kill —— Node 仍持有 tar.stdout 的读端，只停止 pipe 的话 tar 会永久阻塞在写管道上，
    // 锁也就一直不释放（改前就是这个状态：中断一次导出，之后 30 分钟内备份都 409）。
    // kill 后 tar 触发 close → 按 clientGone 静默收尾并释放锁
    clientDisconnected() {
      clientGone = true;
      tar.kill('SIGTERM');
    }
  };
}

module.exports = { openExportArchive };
