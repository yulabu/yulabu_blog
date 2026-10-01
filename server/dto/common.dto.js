const AppError = require('@errors/AppError');

// 路径/请求体里的单个 id：默认读 params.id，也可指定键名（如 :postId、body 里的 post_id）
// ——这是全站唯一的 id 校验实现（改前散着三套：这里、diary.dto 自写 parseInt、columnController 内联 Number）
function parseId(params, label, key = 'id') {
  const id = Number(params[key]);
  if (!id || id < 1) throw new AppError(400, `无效的${label}ID`);
  return id;
}

function paginate(query) {
  const page = Math.min(1000, Math.max(parseInt(query.page) || 1, 1));
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
  return { page, limit, offset: (page - 1) * limit };
}

// 页大小式分页：日记两个列表用 pageSize 参数名（前端 home 的构建期烘焙与浏览器端都显式传 20、
// admin 传 10，改名要同时动四个前端文件，故保留这个参数名），上限与 paginate 对齐为 50——
// 不夹的话 ?pageSize=999999 会全表拉取再逐行取封面关联
function paginateBySize(query, defaultSize = 20) {
  const page = Math.min(1000, Math.max(parseInt(query.page) || 1, 1));
  const pageSize = Math.min(50, Math.max(parseInt(query.pageSize) || defaultSize, 1));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

module.exports = { parseId, paginate, paginateBySize };
