// 统一引导：模块别名 + 环境变量 + 进程级未处理异常兜底（见 server/bootstrap.js）
require('../bootstrap');
const { sequelize } = require('@config/database');
const { runGC } = require('@jobs/imageGc');

// 图片 GC 的手工入口：孤儿对账回收 + 废弃草稿清理 + 上传临时文件兜底。
// 改前没有 CLI，只能靠 pm2 restart 触发（重启即跑 GC）——排查或验证时没有干净的手工入口。
// 注意：这是破坏性操作（孤儿图片过宽限期会被物理删除），且与常驻任务共用同一套阈值。
if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      const { orphans, drafts, tmpFiles } = await runGC();
      console.log(`[gc] 完成：孤儿图片 ${orphans} 张，废弃草稿 ${drafts} 篇，临时文件 ${tmpFiles} 个`);
      await sequelize.close();
    } catch (e) {
      console.error('[gc] 失败:', e.message);
      process.exit(1);
    }
  })();
}
