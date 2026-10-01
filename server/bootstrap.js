// 所有进程入口的统一引导：模块别名 → 环境变量 → 进程级兜底。
//
// 顺序是硬约束：config/*.js 在 require 期就求值 env 并可能抛错，所以别名与环境必须在任何
// 业务模块之前就位（见 config/env.js 的注释）。改前这前两行在 8 个入口各写一遍。
//
// 例外的两个文件刻意不走这里：
//   - scripts/check-errors.js：必须自己控制 env（先注入占位值、并 delete 掉 UPLOAD_MAX_* 以
//     断言默认限额），若经 dotenv 读 .env 会把删掉的变量又灌回来（见该文件注释）
//   - scripts/check-layers.js：零引导、只扫文本，不 require 任何被测文件
require('module-alias/register');
// quiet：关掉 dotenv 每次启动打的 `◇ injected env (N) from .env` 提示行——它会混进 PM2 的 out 日志
require('dotenv').config({ quiet: true });

const { errTagLine } = require('@utils/log');

// 请求链之外的未处理异常：记一行 [err]（含堆栈）后退出，交 PM2 退避重启。
// 只退出不记会丢现场；只记不退出则进程带着未知状态继续服务——两种都比这更糟。
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  console.error(`${errTagLine('process', `未处理的 Promise 拒绝: ${err.message}`)}\n${err.stack || ''}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error(`${errTagLine('process', `未捕获异常: ${err.message}`)}\n${err.stack || ''}`);
  process.exit(1);
});
