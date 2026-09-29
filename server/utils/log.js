// 日志行格式的唯一出处。应用只往 stdout/stderr 写，由 PM2 收进
// /root/.pm2/logs/blog-server-{out,error}.log（位置与策略见 server/README.md「日志与异常」）。
// 时间戳带显式 +08:00 偏移：进程时区可能是 UTC（生产 Debian 默认），nginx 日志按服务器时区，
// 显式偏移才不会互相误读。偏移量复用 utils/date.js 的时间口径，只此一份。
const { BEIJING_OFFSET_MS } = require('@utils/date');

// 2026-09-29T20:15:03.123+08:00 —— 可排序、可 grep、与 nginx 时间戳能对上
function timestamp() {
  return new Date(Date.now() + BEIJING_OFFSET_MS).toISOString().replace('Z', '+08:00');
}

// 5xx 与未预期错误的日志行：必须带请求上下文，否则 PM2 里多个 500 无法与请求对应
function errorLine(req, status, err) {
  return `[err] ${timestamp()} ${req.method} ${req.originalUrl} ${status} ip=${req.ip} name=${err.name || 'Error'} :: ${err.message || ''}`;
}

// 限流命中：应用层唯一的节流/暴破信号（扫描器被 400 化之后，只剩这里有痕迹）
function warnLine(req, label) {
  return `[warn] ${timestamp()} 限流命中 ${label} ip=${req.ip} ${req.method} ${req.originalUrl}`;
}

module.exports = { timestamp, errorLine, warnLine };
