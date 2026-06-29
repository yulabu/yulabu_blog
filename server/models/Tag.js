module.exports = (sequelize, DataTypes) => {
  const Tag = sequelize.define('Tag', {
    tag_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    tag_name: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
      comment: '分类名称'
    },
    tag_color: {
      type: DataTypes.STRING(7),
      allowNull: false,
    }
  }, {
    tableName: 'Tag',
    timestamps: false // 分类表不需要时间戳
  });
  return Tag;
};