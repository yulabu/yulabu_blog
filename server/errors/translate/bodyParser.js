// body-parser（app.js 的 express.json）错误 → 中文文案。
// 靠 err.type 字符串识别，type 是 body-parser 的内部常量（见 body-parser/lib/read.js）。
// 升级依赖时若这些字符串改名，错误会静默退化成通用 4xx「请求无效」——
// scripts/check-errors.js 对这些 type 有断言，是唯一的护栏。
//
// 顺带记录额度关系：express.json 限 2mb、nginx client_max_body_size 是 10m（见 deploy/astro.md），
// 所以 2mb~10m 之间的请求会原样打到 Express 并由这里接住。
const TYPES = {
  'entity.parse.failed': { status: 400, message: '请求格式错误' },
  'entity.too.large': { status: 413, message: '请求体过大（正文过长或单次提交数据过多）' },
  'charset.unsupported': { status: 415, message: '不支持的字符集' },
  'encoding.unsupported': { status: 415, message: '不支持的内容编码' },
};

function translateBodyParserError(err) {
  const hit = err && err.type ? TYPES[err.type] : null;
  return hit || null;
}

module.exports = translateBodyParserError;
