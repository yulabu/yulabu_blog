const { updateSettingsDTO } = require('@dto/setting.dto');
const { publicSettings } = require('@vo/setting.vo');
// 读行与逐键 upsert（带事务）都在 service（判据③）；控制器只做 取参 → 调 service → 组装 vo
const { readSettings, saveSettings } = require('@services/setting');

// 读：公开设置项（缺行即默认值）。前台文章页 SSR 每次取一遍，表极小、按主键查，无缓存必要
exports.getSettings = async (req, res) => {
  res.json(publicSettings(await readSettings()));
};

// 写：白名单校验后按 key upsert（key/value 表，写同一键即覆盖，幂等；多键同事务）
exports.updateSettings = async (req, res) => {
  const data = updateSettingsDTO(req.body);

  await saveSettings(data);

  res.json({ ...publicSettings(await readSettings()), message: '设置已保存' });
};
