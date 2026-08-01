const AppError = require('@middleware/AppError');

function parseId(params, label) {
  const id = Number(params.id);
  if (!id || id < 1) throw new AppError(400, `无效的${label}ID`);
  return id;
}

function paginate(query) {
  const page = Math.min(1000, Math.max(parseInt(query.page) || 1, 1));
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = { parseId, paginate };
