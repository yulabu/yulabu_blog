const { PUBLIC_KEYS, parseSettingValue } = require('@config/settings');

// 先铺默认值、再用库里的行覆盖：没有行就是用默认值（所以不需要 seed / 迁移）。
// 只输出 public 的键，避免以后加的私有设置项从这个公开接口漏出去。
function publicSettings(rows = []) {
  const stored = new Map(rows.map((row) => [row.setting_key, row.setting_value]));
  const vo = {};

  for (const key of PUBLIC_KEYS) {
    vo[key] = parseSettingValue(key, stored.get(key));
  }

  return vo;
}

module.exports = { publicSettings };
