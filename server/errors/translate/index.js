// 第三方错误 → { status, message } 的有序注册表。
// 单一扩展点：新增一种错误源 = 在本目录加一个文件 + 在下面的数组里加一行。
//
// 顺序即优先级，有两条必须遵守的约束：
// ① 具体类必须排在其基类之前。实测 SequelizeUniqueConstraintError instanceof ValidationError
//    === true，把 Unique 放到 Validation 之后会让 409 静默退化成 400；新增 DatabaseError 分支
//    时同理，必须排在 ForeignKeyConstraintError 之后。scripts/check-errors.js 对这两条有断言。
// ② 通用 4xx 兜底**不在**这张表里 —— 它在 errorHandler 里、结构性排在整张表之后，
//    所以将来新加的翻译器永远不会被兜底遮蔽（旧实现把兜底写在 if 链中间，靠位置生效）。
const AppError = require('@errors/AppError');
const translateMulter = require('./multer');
const translateSequelize = require('./sequelize');
const translateBodyParser = require('./bodyParser');

const registry = [
  // 项目自己的错误类型：status 由抛出方给定，原样透传（4xx 不记日志 / 5xx 记，由 errorHandler 判）
  (err) => (err instanceof AppError ? { status: err.status, message: err.message } : null),
  // 下面三张表互不相交（各自的错误类不同），顺序只影响可读性
  translateMulter,
  translateSequelize,
  translateBodyParser,
];

function translate(err) {
  for (const translator of registry) {
    const hit = translator(err);
    if (hit) return hit;
  }
  return null;
}

module.exports = { translate };
