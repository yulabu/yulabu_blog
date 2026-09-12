// 站点设置（setting 表）的键定义。新增一个设置项只需在这里登记一行——
// 表结构是 key/value，不需要 ALTER，也不需要给老库补数据（缺行即用 default）。
// public: true 的键会由 GET /api/settings 暴露给前台；私有项不要标 public。
const SETTINGS_SCHEMA = {
  comments_enabled: {
    type: 'boolean',
    default: true,
    public: true
  }
};

const PUBLIC_KEYS = Object.keys(SETTINGS_SCHEMA).filter((key) => SETTINGS_SCHEMA[key].public);

// 库里存的是文本，这里是「文本 ↔ 强类型」唯一的转换入口
function parseSettingValue(key, raw) {
  const schema = SETTINGS_SCHEMA[key];
  if (!schema) return undefined;
  if (raw === null || raw === undefined || raw === '') return schema.default;
  if (schema.type === 'boolean') return raw === 'true';
  return raw;
}

function serializeSettingValue(key, value) {
  const schema = SETTINGS_SCHEMA[key];
  if (schema?.type === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

module.exports = { SETTINGS_SCHEMA, PUBLIC_KEYS, parseSettingValue, serializeSettingValue };
