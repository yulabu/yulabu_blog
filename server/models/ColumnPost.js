module.exports = (sequelize, DataTypes) => {
  const ColumnPost = sequelize.define('ColumnPost', {
    column_post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    column_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: '所属专栏ID'
    },
    post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      unique: true,
      comment: '文章ID（唯一，一篇文章只属于一个专栏）'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '专栏内顺序（越小越前）'
    }
  }, {
    tableName: 'column_post',
    timestamps: true,
    underscored: true
  });
  return ColumnPost;
};