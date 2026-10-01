// 错误层回归断言：node scripts/check-errors.js
//
// 为什么需要它：错误翻译表靠第三方库的「内部常量」识别错误——body-parser 的 err.type 字符串、
// Sequelize 的错误类与继承关系、multer 的 err.code。依赖升级改了其中任何一个，错误都会静默
// 退化成通用 4xx/500 而不报错。这个脚本是那张表唯一的护栏，也守着两条容易写错的顺序约束：
//   SequelizeUniqueConstraintError instanceof ValidationError（顺序错了 409 会变 400）
//   SequelizeForeignKeyConstraintError extends DatabaseError（顺序错了 400 会变 500）
// 2026-10 起还守着一组限流断言：SSR 回源（回环，无 XFF）必须免限流、访客（带 XFF）必须被
// publicLimiter 分桶限流——这条止血只挂在 skip 上，没有断言的话挪一下挂载点就会静默复发。
//
// 特性：零依赖、不连数据库、不占端口（监听 127.0.0.1:0）、跑完自动清理。
// 真链路：用真的 express.json 产生 body-parser 错误、真的 errorHandler、真的 notFound、真的 publicLimiter。
const path = require('path');
const os = require('os');
const fs = require('fs');

function main() {
  // 必须在 require 业务模块之前设置：config/env.js 与 config/image.js 都在 require 期求值 env
  process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'check-errors-uploads');
  delete process.env.UPLOAD_MAX_SIZE;
  delete process.env.UPLOAD_MAX_TOTAL_SIZE;
  delete process.env.UPLOAD_MAX_FILES;
  // config/env.js 的必填项占位值：本脚本不连库、不验签，但 require @config/image（经
  // errors/translate/multer）会连带求值 env.js 的必填校验。不给真值 —— 这里要的就是「能加载」
  process.env.DB_NAME = process.env.DB_NAME || 'check-errors';
  process.env.DB_USER = process.env.DB_USER || 'check-errors';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'check-errors';

  require('module-alias/register');

  const express = require('express');
  const { MulterError } = require('multer');
  const Sequelize = require('sequelize');
  const AppError = require('@errors/AppError');
  const errorHandler = require('@middleware/errorHandler');
  const notFound = require('@middleware/notFound');
  const { publicLimiter } = require('@middleware/rateLimiter');

  // ---------- 日志捕获：断言「哪些必须记、哪些绝不能记」 ----------
  const errorLogs = [];
  const warnLogs = [];
  const realError = console.error;
  const realWarn = console.warn;
  let capturing = false;
  console.error = (...args) => (capturing ? errorLogs.push(args.join(' ')) : realError(...args));
  console.warn = (...args) => (capturing ? warnLogs.push(args.join(' ')) : realWarn(...args));

  // ---------- 被测应用 ----------
  function buildError(kind) {
    switch (kind) {
      case 'apperror-400': return new AppError(400, '业务拒绝');
      case 'apperror-500': return new AppError(500, '备份失败：stderr 摘要');
      case 'apperror-507': return new AppError(507, '磁盘空间不足，导出已取消');
      case 'multer-file-size': return new MulterError('LIMIT_FILE_SIZE');
      case 'multer-file-count': return new MulterError('LIMIT_FILE_COUNT');
      case 'multer-unexpected': return new MulterError('LIMIT_UNEXPECTED_FILE');
      case 'multer-field-value': return new MulterError('LIMIT_FIELD_VALUE'); // 未逐码映射的码
      case 'seq-unique': return new Sequelize.UniqueConstraintError({ errors: [{ message: 'tag_name 重复' }] });
      case 'seq-validation': return new Sequelize.ValidationError('校验失败', [{ message: '标签名不能为空' }]);
      case 'seq-fk': return new Sequelize.ForeignKeyConstraintError({ message: '外键约束', fields: { 0: 'tag_id' } });
      case 'seq-connection': return new Sequelize.ConnectionRefusedError(new Error('connect ECONNREFUSED 127.0.0.1:3306'));
      case 'seq-database': return new Sequelize.DatabaseError(new Error('Unknown column in field list'));
      case 'framework-418': return Object.assign(new Error('teapot'), { status: 418, type: 'teapot' });
      case 'framework-503': return Object.assign(new Error('downstream down'), { statusCode: 503 });
      case 'unknown': return new Error('boom');
      default: throw new Error(`未知的错误类型: ${kind}`);
    }
  }

  const app = express();
  // 与生产 app.js 同款：express-rate-limit 8.x 靠它解析 X-Forwarded-For 分桶。
  // 这行是限流断言的前提——不设 'loopback'，带 XFF 的请求 req.ip 也是 127.0.0.1，
  // 会被 publicLimiter 的 skip 一并放行，那组断言就「全绿但什么都没测到」
  app.set('trust proxy', 'loopback');
  app.use(express.json({ limit: '2mb' }));
  app.post('/throw', (req, res) => {
    throw buildError(req.body.kind);
  });
  // 响应已结束之后再抛：验证 headersSent 守卫把错误交回下游（Express 默认处理器位置）
  app.get('/headers-sent', (req, res) => {
    res.json({ ok: true });
    throw new Error('响应之后才抛');
  });
  // 限流断言用：公开桶的挂载形态与生产 app.js 一致（publicLimiter + 普通处理器）
  app.get('/__rate-limit-probe', publicLimiter, (req, res) => res.json({ ok: true, ip: req.ip }));
  app.use(notFound);
  app.use(errorHandler);
  const delegated = [];
  app.use((err, req, res, _next) => {
    delegated.push(err);
  });

  const MB = 1024 * 1024;
  let base = '';
  const send = async (method, pathname, headers, body) => {
    const res = await fetch(base + pathname, { method, headers, body });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* 非 JSON 响应（不该出现） */ }
    return { status: res.status, json, text };
  };
  const post = (pathname, body) => send('POST', pathname, { 'Content-Type': 'application/json' }, JSON.stringify(body));
  const postRaw = (pathname, body, contentType) => send('POST', pathname, { 'Content-Type': contentType }, body);
  const get = (pathname) => send('GET', pathname, {}, undefined);

  // 名称, 请求, 期望状态, 期望 message, 是否应记日志
  const cases = [
    ['AppError 400 原样透传', () => post('/throw', { kind: 'apperror-400' }), 400, '业务拒绝', false],
    ['AppError 400 不记日志（负向）', () => post('/throw', { kind: 'apperror-400' }), 400, '业务拒绝', false],
    ['AppError 500 原样 + 必记日志', () => post('/throw', { kind: 'apperror-500' }), 500, '备份失败：stderr 摘要', true],
    ['AppError 507 原样 + 必记日志', () => post('/throw', { kind: 'apperror-507' }), 507, '磁盘空间不足，导出已取消', true],
    ['multer 单张超限', () => post('/throw', { kind: 'multer-file-size' }), 413, '单张图片不能超过 5MB', false],
    ['multer 张数超限', () => post('/throw', { kind: 'multer-file-count' }), 413, '单次最多上传 50 张图片', false],
    ['multer 字段名不对', () => post('/throw', { kind: 'multer-unexpected' }), 400, '上传字段名不正确，请从页面上传入口重新上传', false],
    ['multer 未映射码 → 中文通用', () => post('/throw', { kind: 'multer-field-value' }), 400, '上传数据不符合要求，请重新上传', false],
    ['Sequelize 唯一约束 → 409（顺序陷阱①）', () => post('/throw', { kind: 'seq-unique' }), 409, '数据已存在，请勿重复提交', false],
    ['Sequelize 校验失败 → 400', () => post('/throw', { kind: 'seq-validation' }), 400, '标签名不能为空', false],
    ['Sequelize 外键约束 → 400（顺序陷阱②）', () => post('/throw', { kind: 'seq-fk' }), 400, '关联数据不存在', false],
    ['Sequelize 连接类 → 503 + 记日志', () => post('/throw', { kind: 'seq-connection' }), 503, '服务暂时不可用，请稍后重试', true],
    ['Sequelize DatabaseError → 兜底 500 + 记日志', () => post('/throw', { kind: 'seq-database' }), 500, '服务器内部错误', true],
    ['未知错误 → 500 + 记日志', () => post('/throw', { kind: 'unknown' }), 500, '服务器内部错误', true],
    ['框架错误带 4xx status → 放行', () => post('/throw', { kind: 'framework-418' }), 418, '请求无效', false],
    ['框架错误带 5xx status → 不许伪装成客户端错误', () => post('/throw', { kind: 'framework-503' }), 500, '服务器内部错误', true],
    ['JSON 语法错误（真 body-parser）', () => postRaw('/throw', '{不是 JSON', 'application/json'), 400, '请求格式错误', false],
    ['请求体超 2mb（真 body-parser）', () => postRaw('/throw', JSON.stringify({ pad: 'x'.repeat(3 * MB) }), 'application/json'), 413, '请求体过大（正文过长或单次提交数据过多）', false],
    ['不支持的 charset（真 body-parser）', () => postRaw('/throw', '{}', 'application/json; charset=iso-8859-2'), 415, '不支持的字符集', false],
    ['未知路径 → JSON 404', () => get('/no-such-path'), 404, '接口不存在', false],
  ];

  const server = app.listen(0, '127.0.0.1', async () => {
    base = `http://127.0.0.1:${server.address().port}`;
    capturing = true;

    const rows = [];
    let failed = 0;
    for (const [name, request, wantStatus, wantMessage, wantLogged] of cases) {
      const before = errorLogs.length;
      const res = await request();
      const logged = errorLogs.length > before;
      const ok = res.status === wantStatus && res.json?.message === wantMessage && logged === wantLogged;
      if (!ok) failed++;
      rows.push({
        ok,
        name,
        detail: `${res.status} ${JSON.stringify(res.json?.message ?? res.text.slice(0, 40))}${logged ? ' +日志' : ''}`,
        want: ok ? '' : `期望 ${wantStatus} ${JSON.stringify(wantMessage)}${wantLogged ? ' +日志' : '（不记日志）'}`,
      });
    }

    // headersSent 守卫：响应仍是原样 200，且错误被交给下游（不是自己再写一次响应）
    const hs = await get('/headers-sent');
    const hsOk = hs.status === 200 && hs.json?.ok === true && delegated.length === 1;
    if (!hsOk) failed++;
    rows.push({
      ok: hsOk,
      name: 'headersSent → 交给下游（官方要求）',
      detail: `${hs.status} ${JSON.stringify(hs.json)} delegated=${delegated.length}`,
      want: hsOk ? '' : '期望 200 {ok:true} 且下游收到 1 个错误',
    });

    // 全局日志策略：应记的条数刚好等于标记数，且没有 warn 泄漏到错误路径
    const wantLogCount = cases.filter(([, , , , logged]) => logged).length;
    const policyOk = errorLogs.length === wantLogCount && warnLogs.length === 0;
    if (!policyOk) failed++;
    rows.push({
      ok: policyOk,
      name: '日志策略总量（只有 5xx 记、没有多余 warn）',
      detail: `err=${errorLogs.length} warn=${warnLogs.length}`,
      want: policyOk ? '' : `期望 err=${wantLogCount} warn=0`,
    });

    // 日志行格式：能定位到请求（方法/URL/状态/IP/错误名），且带堆栈
    const first = errorLogs[0] || '';
    const fmtOk =
      /^\[err\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+08:00 POST \/throw \d+ ip=\S+ name=\S+ :: /.test(first) &&
      first.includes('\n    at ');
    if (!fmtOk) failed++;
    rows.push({
      ok: fmtOk,
      name: '错误日志行格式（含请求上下文 + 堆栈）',
      detail: first.split('\n')[0].slice(0, 110) || '(无日志)',
      want: fmtOk ? '' : '期望 [err] <ISO+08:00> <METHOD> <URL> <status> ip=... name=... :: ... 且带堆栈',
    });

    // ---- 限流与 SSR 回环放行（2026-10 止血的行为锁）----
    // 回环（SSR 回源，不带 XFF）连发 61 次必须 0×429；访客（同一 XFF）连发 61 次必须第 61 次命中。
    // 断言放在这里（capturing 关闭之前）才能顺带检查「限流命中」的 warn 行是否记了桶名与真实 IP
    const LOOPBACK_TRIES = 61;
    let loopback429 = 0;
    for (let i = 0; i < LOOPBACK_TRIES; i++) {
      const r = await send('GET', '/__rate-limit-probe', {}, undefined);
      if (r.status === 429) loopback429++;
    }
    const loopbackOk = loopback429 === 0;
    if (!loopbackOk) failed++;
    rows.push({
      ok: loopbackOk,
      name: '限流：回环免限流（SSR 回源）',
      detail: `61 次请求 429×${loopback429}`,
      want: loopbackOk ? '' : '期望回环请求一次都不被限流（publicLimiter 的 skip / isLoopbackIp 失效了？）',
    });

    const visitorIp = '203.0.113.7';
    const warnBefore = warnLogs.length;
    const visitorRuns = [];
    for (let i = 0; i < LOOPBACK_TRIES; i++) {
      visitorRuns.push(await send('GET', '/__rate-limit-probe', { 'X-Forwarded-For': visitorIp }, undefined));
    }
    const visitor429 = visitorRuns.filter((r) => r.status === 429);
    const visitorOk =
      visitor429.length === 1 &&
      visitorRuns[LOOPBACK_TRIES - 1].status === 429 &&
      visitor429[0].json?.message === '请求过于频繁，请稍后重试' &&
      warnLogs.slice(warnBefore).some((line) => line.includes('限流命中 public') && line.includes(`ip=${visitorIp}`));
    if (!visitorOk) failed++;
    rows.push({
      ok: visitorOk,
      name: '限流：访客按 XFF 分桶命中 429 + 记 warn',
      detail: `429×${visitor429.length}，末次=${visitorRuns[LOOPBACK_TRIES - 1].status}，报警=${warnLogs.length - warnBefore} 行`,
      want: visitorOk ? '' : `期望前 60 次 200、第 61 次 429 + 「限流命中 public ip=${visitorIp}」warn 一行`,
    });

    capturing = false;

    console.log('错误层回归断言（scripts/check-errors.js）\n');
    for (const r of rows) {
      console.log(`  ${r.ok ? '通过' : '失败'}  ${r.name.padEnd(46)} ${r.detail}`);
      if (!r.ok) console.log(`        ${r.want}`);
    }
    console.log(`\n共 ${rows.length} 条，失败 ${failed} 条`);

    server.close();
    fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
    if (failed) {
      console.log('结果：失败');
      process.exitCode = 1;
    } else {
      console.log('结果：通过');
    }
  });
}

// 守卫：被 require（如全量加载检查）时不得启动服务、不得改 console
if (require.main === module) {
  main();
}
