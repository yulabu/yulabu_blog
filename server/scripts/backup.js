require('module-alias/register');
require('dotenv').config();
const { runBackup } = require('@utils/backup');

// 每日备份 CLI（cron / 手动执行）：导出数据库 + 刷新 uploads 镜像 + 清理过期 dump
// crontab 示例：0 4 * * * root cd /var/www/yulabu_blog/server && /usr/bin/node scripts/backup.js >> /var/log/blog-backup.log 2>&1

if (require.main === module) {
  (async () => {
    try {
      const info = await runBackup();
      console.log(`[backup] 备份完成: ${info.filename} (${(info.size / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.error('[backup] 失败:', e.message);
      process.exit(1);
    }
  })();
}

module.exports = runBackup;
