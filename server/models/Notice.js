module.exports = (sequelize, DataTypes) => {
  const Notice = sequelize.define('Notice', {
    notice_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键'
    },
    notice_title: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '标题'
    },
    notice_content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '内容'
    },
    notice_status: {
      type: DataTypes.ENUM('show', 'hide'),
      defaultValue: 'show',
      comment: '状态：show-显示 hide-隐藏'
    },
    notice_is_pinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否置顶'
    }
  }, {
    tableName: 'notice',
    timestamps: true,
    underscored: true,
    comment: '公告表'
  });
  return Notice;
};
