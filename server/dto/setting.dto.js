const AppError = require('@errors/AppError');
const { validateSettingValue } = require('@config/settings');

// 写入口径：只接受 SETTINGS_SCHEMA 里登记过的键（未知键直接 400，不让任意 key 落库），
// 值以强类型返回，序列化交给 config/settings.js。
//
// 「键 → 类型 → 校验规则」全部由 config/settings.js 拥有（判据：值驱动行为，值与行为同处一层）——
// 改前这里自己硬写一份 `schema.type !== 'boolean'`，加第二种类型要同时改两处。
// dto 只负责把校验失败转成 AppError（config 属共享内核，不能依赖 @errors，只能返回结果）。
function updateSettingsDTO(body) {
  const dto = {};

  for (const [key, value] of Object.entries(body || {})) {
    const result = validateSettingValue(key, value);
    if (!result.ok) throw new AppError(400, result.message);
    dto[key] = value;
  }

  if (Object.keys(dto).length === 0) throw new AppError(400, '没有需要更新的设置');
  return dto;
}

module.exports = { updateSettingsDTO };
