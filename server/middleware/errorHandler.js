const AppError = require('@middleware/AppError');
const { MulterError } = require('multer');

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message });
  }

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: '文件大小超过限制' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({ message: '文件数量超过限制' });
    }
    return res.status(400).json({ message: err.message });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: '请求格式错误' });
  }

  // body-parser 自己抛的错误带 4xx status（请求体超限 413、不支持的 charset 415），
  // 以前没有对应分支，一律掉到最后那档、被当成"服务器内部错误"。
  // nginx 的 client_max_body_size 是 10m，而 express.json() 默认只收 100kb，
  // 所以 100kb~10m 之间的请求会原样打到 Express 并由这里接住
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: '请求体过大' });
  }
  if (err.type === 'charset.unsupported') {
    return res.status(415).json({ message: '不支持的字符集' });
  }
  // 兜住其余带 4xx 语义的框架错误（http-errors 系）。刻意只放 4xx 通过：
  // 5xx 与无 status 的意外错误仍然走下面的兜底，不能被伪装成客户端错误
  const status = err.status || err.statusCode;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ message: '请求无效' });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: '数据已存在，请勿重复提交' });
  }

  if (err.name === 'SequelizeValidationError') {
    const msg = err.errors?.[0]?.message || '数据校验失败';
    return res.status(400).json({ message: msg });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ message: '关联数据不存在' });
  }

  console.error('服务器内部错误:', err);
  res.status(500).json({ message: '服务器内部错误' });
}

module.exports = errorHandler;