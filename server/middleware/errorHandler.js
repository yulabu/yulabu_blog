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