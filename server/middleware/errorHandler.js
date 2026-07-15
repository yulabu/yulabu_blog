const AppError = require('./AppError');

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message });
  }

  // 其他意外错误，日志里记录详情，前端只给模糊提示
  console.error('服务器内部错误:', err);
  res.status(500).json({ message: '服务器内部错误' });
}

module.exports = errorHandler;