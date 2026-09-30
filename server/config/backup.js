const path = require('path')
const env = require('./env')

// 备份根目录（默认仓库根 /backups；db dump、uploads 镜像、导出附带文件都在这里）
const BACKUP_DIR = env.paths.backupDir
  ? path.resolve(env.paths.backupDir)
  : path.resolve(__dirname, '..', '..', 'backups')

// dump 保留份数（超出后从最旧开始清理）
const BACKUP_KEEP = env.backup.keep

module.exports = { BACKUP_DIR, BACKUP_KEEP }
