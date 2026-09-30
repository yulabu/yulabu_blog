const { listBackups, runBackup, deleteDump } = require('@services/backup/run')
const { openExportArchive } = require('@services/backup/export')

// 备份列表 + uploads 镜像统计
const getBackups = async (req, res) => {
  res.json(await listBackups())
}

// 立即执行一次备份
const createBackup = async (req, res) => {
  const backup = await runBackup()
  res.json({ message: '备份完成', backup })
}

// 导出完整备份包（dump + uploads 镜像 + 恢复脚本/说明，tar.gz 流式下载）
// HTTP 只在这一层：下载头、把 tar 流 pipe 给响应、客户端断开时通知服务层
const exportBackup = async (req, res) => {
  const archive = await openExportArchive(req.params.filename)
  res.setHeader('Content-Type', 'application/gzip')
  res.setHeader('Content-Disposition', `attachment; filename="${archive.downloadName}"`)
  res.on('close', () => archive.clientDisconnected())
  archive.stream.pipe(res)
  try {
    await archive.finished
  } catch (err) {
    // 头部已发出：先断连接，再交给错误出口（5xx 必记日志的规则不能在流式路径上失守）
    if (res.headersSent) res.destroy()
    throw err
  }
}

// 删除指定 dump（文件名白名单校验在 services 内）
const deleteBackup = async (req, res) => {
  await deleteDump(req.params.filename)
  res.json({ message: '已删除' })
}

module.exports = { getBackups, createBackup, exportBackup, deleteBackup }
