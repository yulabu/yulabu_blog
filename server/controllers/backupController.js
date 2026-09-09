const { listBackups, runBackup, streamExportBackup, deleteDump } = require('@utils/backup')

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
const exportBackup = async (req, res) => {
  await streamExportBackup(req.params.filename, res)
}

// 删除指定 dump（文件名白名单校验在 utils 内）
const deleteBackup = async (req, res) => {
  await deleteDump(req.params.filename)
  res.json({ message: '已删除' })
}

module.exports = { getBackups, createBackup, exportBackup, deleteBackup }
