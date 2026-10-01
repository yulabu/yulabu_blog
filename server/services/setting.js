// 站点设置域的服务层（判据③：一次请求内的多步写必须同事务且落在 services）。
//
// 表是 key/value（键定义、文本↔强类型编解码都在 config/settings.js），写入 = 逐键 upsert。
// 改前这一步写在 settingController 里用 Promise.all，无事务：一旦有 2 个以上设置项，
// 中途失败就会留下「一半新一半旧」，而接口回 500、前端只提示失败（现在只有 comments_enabled
// 一个键，物理上写不出半保存——这条是防第二个键加进来那天）。读路径同样收在这里，
// controller 退化成「取参(DTO) → 调 service → 组装 vo」。
const { sequelize, Setting } = require('@models');
const { serializeSettingValue } = require('@config/settings');

// 全部设置行（raw）：缺行即默认值（不用 seed、不用迁移）。
// 解析与公开键白名单在 vo/setting.vo.js（读）与 config/settings.js（编解码）——这里只负责取行
async function readSettings() {
  return Setting.findAll({ raw: true });
}

// 逐键 upsert：整体一个事务，全成或全不写；返回写入的键数
async function saveSettings(data) {
  const entries = Object.entries(data);
  await sequelize.transaction(async (t) => {
    for (const [key, value] of entries) {
      await Setting.upsert(
        { setting_key: key, setting_value: serializeSettingValue(key, value) },
        { transaction: t }
      );
    }
  });
  return entries.length;
}

module.exports = { readSettings, saveSettings };
