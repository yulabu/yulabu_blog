const { translate } = require('@errors/translate');
const { errorBody } = require('@errors/contract');
const { errorLine } = require('@utils/log');

// 全站唯一的错误出口（app.js 里最后一个 app.use）。四步，顺序即语义：
//   ① 响应已开始 → 交回 Express 默认处理器
//   ② 翻译表命中 → 用翻译结果（第三方错误 → { status, message }）
//   ③ 通用兜底 → 带 4xx 语义的框架错误 / 无法识别的错误（结构性排在整张表之后）
//   ④ 写响应；日志策略只在这一处按最终状态码判定（5xx 记、4xx 不记）
//
// 约定：所有业务错误靠 throw（全站没有一处手工 next(err)，Express 5 会自动接住 async 抛错）。
// 签名必须是 4 个参数——Express 靠参数个数识别错误处理中间件，不要把 next 当未使用变量删掉。
function errorHandler(err, req, res, next) {
  // Express 官方要求：headers 已发出时必须交回默认处理器（默认处理器会中断连接）。
  // 本项目有流式端点（备份导出把 tar 直接 pipe 到 res），这不是理论情况
  if (res.headersSent) {
    return next(err);
  }

  const hit = translate(err);

  // 兜底只看 err.status/statusCode 里的 4xx：刻意只放 4xx 通过——5xx 与无 status 的
  // 意外错误仍走 500，不能被伪装成客户端错误
  const claimed = Number(err.status || err.statusCode);
  const status = hit ? hit.status : (claimed >= 400 && claimed < 500 ? claimed : 500);
  const message = hit ? hit.message : (status === 500 ? '服务器内部错误' : '请求无效');

  // 日志策略的唯一判据。5xx 必记，且**包含 AppError(5xx)**——旧实现对 AppError 早返回，
  // 备份链那四句运维级失败（缺 mysqldump / dump 产物异常 / 磁盘不足 / 打包失败）
  // 在日志里完全看不见，与「5xx 必须可追溯」直接冲突
  if (status >= 500) {
    console.error(`${errorLine(req, status, err)}\n${err.stack || ''}`);
  }

  res.status(status).json(errorBody(message));
}

module.exports = errorHandler;
