const AppError = require('@middleware/AppError');
const { SETTINGS_SCHEMA } = require('@config/settings');

// 写入口径：只接受 SETTINGS_SCHEMA 里登记过的键（未知键直接 400，不让任意 key 落库），
// 值按 schema.type 校验后以强类型返回，序列化交给 config/settings.js
function updateSettingsDTO(body) {
  const dto = {};

  for (const [key, value] of Object.entries(body || {})) {
    const schema = SETTINGS_SCHEMA[key];
    if (!schema) throw new AppError(400, `不支持的设置项：${key}`);
    if (schema.type !== 'boolean') throw new AppError(400, `设置项 ${key} 的类型尚未实现`);
    if (typeof value !== 'boolean') throw new AppError(400, `设置项 ${key} 必须是布尔值`);
    dto[key] = value;
  }

  if (Object.keys(dto).length === 0) throw new AppError(400, '没有需要更新的设置');
  return dto;
}

module.exports = { updateSettingsDTO };
