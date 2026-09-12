const { Setting } = require('@models');
const { updateSettingsDTO } = require('@dto/setting.dto');
const { serializeSettingValue } = require('@config/settings');
const { publicSettings } = require('@vo/setting.vo');

// 读：公开设置项（缺行即默认值）。前台文章页 SSR 每次取一遍，表极小、按主键查，无缓存必要
exports.getSettings = async (req, res) => {
  const rows = await Setting.findAll({ raw: true });
  res.json(publicSettings(rows));
};

// 写：白名单校验后按 key upsert（key/value 表，写同一键即覆盖，幂等）
exports.updateSettings = async (req, res) => {
  const data = updateSettingsDTO(req.body);

  await Promise.all(
    Object.entries(data).map(([key, value]) =>
      Setting.upsert({ setting_key: key, setting_value: serializeSettingValue(key, value) })
    )
  );

  const rows = await Setting.findAll({ raw: true });
  res.json({ ...publicSettings(rows), message: '设置已保存' });
};
