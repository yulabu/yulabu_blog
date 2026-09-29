// Sequelize 错误 → { status, message }。
// 顺序即优先级：UniqueConstraintError instanceof ValidationError === true（实测），
// 所以 Unique 必须排在 Validation 之前，否则 409 会静默退化成 400。将来新增 DatabaseError
// 分支时同理，必须排在 ForeignKeyConstraintError 之后。scripts/check-errors.js 有断言守着。
const {
  UniqueConstraintError,
  ForeignKeyConstraintError,
  ValidationError,
  ConnectionError,
} = require('sequelize');

const CHECKS = [
  [UniqueConstraintError, { status: 409, message: '数据已存在，请勿重复提交' }],
  [ForeignKeyConstraintError, { status: 400, message: '关联数据不存在' }],
  [
    ValidationError,
    (err) => ({ status: 400, message: err.errors?.[0]?.message || '数据校验失败' }),
  ],
  // 连接类错误 = 数据库不可用（重启 / 抖动 / 网络），语义是「稍后重试」而不是「程序出错」。
  // 一个 ConnectionError 覆盖全部 7 个子类：ConnectionRefused / ConnectionTimedOut /
  // HostNotFound / HostNotReachable / AccessDenied / InvalidConnection / ConnectionAcquireTimeout。
  // 落在 5xx，会被 errorHandler 记日志（否则数据库不可用只留一句无迹可查的 500）
  [ConnectionError, { status: 503, message: '服务暂时不可用，请稍后重试' }],
];

function translateSequelizeError(err) {
  for (const [ErrorClass, value] of CHECKS) {
    if (!(err instanceof ErrorClass)) continue;
    return typeof value === 'function' ? value(err) : value;
  }
  // 其余 DatabaseError（SQL 报错等）属程序 bug：不在这里映射，走 errorHandler 的 500 兜底 + 记日志
  return null;
}

module.exports = translateSequelizeError;
