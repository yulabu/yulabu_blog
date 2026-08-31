module.exports = (sequelize, DataTypes) => {
  const VisitLog = sequelize.define('VisitLog', {
    visit_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: '关联文章ID，非文章页为NULL'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: false,
      comment: '访客IP'
    },
    user_agent: {
      type: DataTypes.STRING(512),
      allowNull: true,
      comment: '浏览器UA'
    },
    referrer: {
      type: DataTypes.STRING(512),
      allowNull: true,
      comment: '来源页'
    },
    page_path: {
      type: DataTypes.STRING(256),
      allowNull: false,
      comment: '访问路径'
    }
  }, {
    tableName: 'visit_log',
    timestamps: true,
    underscored: true
  });
  return VisitLog;
};
