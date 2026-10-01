// 站点设置（setting 表）的键定义与编解码——config/ 里的「动态配置」半边。
// env 那半边（env.js / database / image / auth / backup）由运维在部署时定；这半边由管理员在后台定
// （存 DB，缺行即默认值）。二者都是「外部输入」，所以都在 config/。内部实现常量（限流阈值、GC 保留期、
// 抓图超时等）刻意不进这里——它们随代码走，不进 config 的判据见 AGENTS.md「config/ 的职责边界」。
//
// 新增一个设置项只需在这里登记一行——
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

// 「值 → 类型校验」也归这里：值（schema.type）驱动行为（校验规则），两者必须同处一层
// （判据见 AGENTS.md「可选值归属」）。改前 dto/setting.dto.js 自己硬写一份 `type !== 'boolean'`，
// 于是加第二种类型要改两处，而"支持哪些类型"没有拥有者。
//
// 只返回结果、不抛错：本模块属共享内核，护栏② 禁止 config/ 依赖 @errors（AppError 在 errors/），
// 所以由 dto 把 { ok: false } 转成 400。message 即给管理员看的文案。
function validateSettingValue(key, value) {
  const schema = SETTINGS_SCHEMA[key];
  if (!schema) return { ok: false, message: `不支持的设置项：${key}` };

  if (schema.type === 'boolean') {
    return typeof value === 'boolean'
      ? { ok: true }
      : { ok: false, message: `设置项 ${key} 必须是布尔值` };
  }

  return { ok: false, message: `设置项 ${key} 的类型尚未实现` };
}

module.exports = { SETTINGS_SCHEMA, PUBLIC_KEYS, parseSettingValue, serializeSettingValue, validateSettingValue };
