module.exports = (sequelize, DataTypes) => {
  const Column = sequelize.define('Column', {
    column_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    column_name: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '专栏名称'
    },
    column_desc: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: '专栏简介'
    },
    column_cover: {
      type: DataTypes.STRING(512),
      allowNull: true,
      comment: '封面图URL'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '专栏排序（越小越前）'
    },
    status: {
      // draft 追加在末尾：MySQL ENUM 按索引存储，插入前面会导致现有数据错位
      type: DataTypes.ENUM('show', 'hide', 'draft'),
      defaultValue: 'show',
      comment: '显示状态'
    }
  }, {
    tableName: 'blog_column',
    timestamps: true,
    underscored: true
  });
  return Column;
};