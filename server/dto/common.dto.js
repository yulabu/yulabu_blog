const AppError = require('@middleware/AppError');

function parseId(params, label) {
  const id = Number(params.id);
  if (!id || id < 1) throw new AppError(400, `无效的${label}ID`);
  return id;
}

module.exports = { parseId };
