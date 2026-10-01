// 日志行格式的唯一出处。应用只往 stdout/stderr 写，由 PM2 收进
// /root/.pm2/logs/blog-server-{out,error}.log（位置与策略见 server/README.md「日志」）。
// 时间戳带显式 +08:00 偏移：进程时区可能是 UTC（生产 Debian 默认），nginx 日志按服务器时区，
// 显式偏移才不会互相误读。偏移量复用 utils/date.js 的时间口径，只此一份。
//
// 本模块**只格式化、不写入**（utils/ 无 I/O，护栏断言④）：写 stdout/stderr 由调用点的
// console 完成。运行期代码里凡是「直接 console 写字符串」都会被护栏断言⑥ 拦下。
//
// 五种行（同族：level 与时间戳在前，便于 grep '^\[err\]' 按级别捞）。
// 注意 level 后都只跟**一个**空格——这个字节数被 scripts/check-errors.js 的正则断言锁着，
// 改动本文件后必须重跑那条护栏：
//   [info] <ts> [tag] 消息       常规信息（启动、任务进度、备份进度）      → stdout
//   [warn] <ts> [tag] 消息       非致命异常                              → stderr
//   [err] <ts> [tag] 消息        失败                                    → stderr
//   [err] <ts> <方法> <URL> …    请求内的 5xx（errorLine，带请求上下文）   → stderr
//   [warn] <ts> 限流命中 …        限流命中（warnLine）                     → stderr
const { BEIJING_OFFSET_MS } = require('@utils/date');

// 2026-09-29T20:15:03.123+08:00 —— 可排序、可 grep、与 nginx 时间戳能对上
function timestamp() {
  return new Date(Date.now() + BEIJING_OFFSET_MS).toISOString().replace('Z', '+08:00');
}

// 常规信息行：tag 取模块/任务名（server / sync-schema / image-gc / daily-stat / visit-gc /
// backup / image-ref / image-store / og-image），写成同一处规定的定长前缀
function infoLine(tag, message) {
  return `[info] ${timestamp()} [${tag}] ${message}`;
}

// 非致命异常行（如 backup 读磁盘余量失败、抓图失败）
function warnTagLine(tag, message) {
  return `[warn] ${timestamp()} [${tag}] ${message}`;
}

// 失败行（任务失败、备份失败等非请求上下文）
function errTagLine(tag, message) {
  return `[err] ${timestamp()} [${tag}] ${message}`;
}

// 5xx 与未预期错误的日志行：必须带请求上下文，否则 PM2 里多个 500 无法与请求对应
function errorLine(req, status, err) {
  return `[err] ${timestamp()} ${req.method} ${req.originalUrl} ${status} ip=${req.ip} name=${err.name || 'Error'} :: ${err.message || ''}`;
}

// 限流命中：应用层唯一的节流/暴破信号（扫描器被 400 化之后，只剩这里有痕迹）
function warnLine(req, label) {
  return `[warn] ${timestamp()} 限流命中 ${label} ip=${req.ip} ${req.method} ${req.originalUrl}`;
}

module.exports = { timestamp, errorLine, warnLine, infoLine, warnTagLine, errTagLine };
