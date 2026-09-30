// 备份链的跨进程互斥锁。
// 为什么是文件锁：cron CLI 与 pm2 服务是两个进程，模块级变量不共享——
// 备份与导出并发会同时写同一份 uploads 镜像，靠 BACKUP_DIR/.lock（PID+时间戳）互斥；
// 时间过久视为进程崩溃残留，强制接管（wx 原子创建保证同时接管时只有一个成功）。
const fsp = require('fs').promises
const path = require('path')
const AppError = require('@errors/AppError')
const { BACKUP_DIR } = require('@services/backup/layout')

const LOCK_PATH = path.join(BACKUP_DIR, '.lock')
const LOCK_STALE_MS = 30 * 60 * 1000

async function acquireLock() {
  await fsp.mkdir(BACKUP_DIR, { recursive: true })
  // wx = O_EXCL 原子创建，并发时只有一个进程成功
  try {
    await fsp.writeFile(LOCK_PATH, `${process.pid} ${Date.now()}`, { flag: 'wx' })
  } catch (e) {
    if (e.code !== 'EEXIST') throw e
    const raw = await fsp.readFile(LOCK_PATH, 'utf8').catch(() => '')
    const ts = Number(String(raw).trim().split(' ')[1])
    if (Number.isFinite(ts) && Date.now() - ts < LOCK_STALE_MS) {
      throw new AppError(409, '备份/导出任务进行中，请稍后再试')
    }
    // 死锁接管：删残留锁重试一次；wx 保证多个进程同时接管时只有一个成功
    await fsp.unlink(LOCK_PATH).catch(() => {})
    await fsp.writeFile(LOCK_PATH, `${process.pid} ${Date.now()}`, { flag: 'wx' })
  }
}

async function releaseLock() {
  await fsp.unlink(LOCK_PATH).catch(() => {})
}

module.exports = { acquireLock, releaseLock, LOCK_PATH, LOCK_STALE_MS }
