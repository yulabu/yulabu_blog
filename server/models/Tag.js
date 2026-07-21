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
    }
  }, {
    tableName: 'Tag',
    timestamps: false // 分类表不需要时间戳
  });
  return Tag;
};