// 备份目录布局与 dump 文件名的唯一出处。
// 单独成文件是为了让 run（生产备份）与 export（导出打包）共用同一份路径事实——
// 两处各算一遍目录名，就会出现「列表能看到、导出找不到」这类分叉。
const path = require('path')
const { BACKUP_DIR } = require('@config/backup')

// 备份布局：<BACKUP_DIR>/db/blog-*.sql.gz + <BACKUP_DIR>/uploads/（rsync 镜像）
// 导出包时会在 BACKUP_DIR 根下生成 restore.sh 与 README-恢复说明.txt 一并打包
const DB_BACKUP_DIR = path.join(BACKUP_DIR, 'db')
const UPLOADS_MIRROR_DIR = path.join(BACKUP_DIR, 'uploads')
// dump 文件名白名单，同时防路径穿越（接口入参直接来自 URL）
const DUMP_FILE_RE = /^blog-\d{8}-\d{6}\.sql\.gz$/

module.exports = { BACKUP_DIR, DB_BACKUP_DIR, UPLOADS_MIRROR_DIR, DUMP_FILE_RE }
