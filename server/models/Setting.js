module.exports = (sequelize, DataTypes) => {
  const Setting = sequelize.define('Setting', {
    // 键即主键：一张 key/value 表承载所有站点设置，新增设置项不需要改结构
    setting_key: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      comment: '设置键（取值见 config/settings.js 的 SETTINGS_SCHEMA）'
    },
    setting_value: {
      type: DataTypes.TEXT,
      comment: '设置值（统一按文本存，解析见 config/settings.js）'
    }
  }, {
    tableName: 'setting',
    timestamps: true,
    underscored: true
  });

  return Setting;
};
