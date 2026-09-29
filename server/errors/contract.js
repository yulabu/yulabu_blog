// 全站错误响应形状的唯一出处（auth / 限流器 / errorHandler 共用）。
// 约定：错误体只有 message —— 人话，可直接展示给用户/管理员。
// 将来若要加机器可读的 code（例如区分「未登录」与「token 过期」），只改这里 + 各产出点传参，
// 属纯增量字段，前端可忽略。
//
// 重要约束：AppError 的 message 会**原样返回给客户端**（含 5xx）。所以它只写可执行的运维人话
// （例：「未找到 mysqldump，请先安装 mariadb-client」），绝不塞堆栈、密钥、内部路径。
// 当前的客户端是「需要登录的管理员本人」，把诊断信息直接告诉他比让他翻日志更有用；
// 若将来接口对多用户开放，这条要重新评估（届时 5xx 应改成通用文案 + 只进日志）。
function errorBody(message) {
  return { message };
}

module.exports = { errorBody };
