const { errorBody } = require('@errors/contract');

// 未命中任何路由的终结器：挂在所有路由与静态之后、errorHandler 之前（app.js）。
// 以前由 Express 默认 finalhandler 兜住，回的是 HTML「Cannot GET /api/xxx」——
// 那是全站唯一的非 JSON 响应，也是外网扫描器最常撞上的那一个
module.exports = (req, res) => {
  res.status(404).json(errorBody('接口不存在'));
};
