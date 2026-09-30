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
    underscored: true,
    // 索引只在这里声明一处：范围查询（后台日志筛选、今日 PV/UV）与 visitGc 的 DELETE 都按
    // created_at 走。不声明 post_id——它的索引由 belongsTo 外键自带（models/index.js），
    // 再声明会像 post_image 那样出现两个同列索引；不声明 ip_address——查询是 LIKE '%..%'，
    // B 树索引用不上。
    // 注意 sync() 的能力边界：**索引**对已存在的表也会补（showIndex 比对后 addIndex），
    // 但**列与 ENUM 值**不会，那些仍归 scripts/sync-schema.js
    indexes: [
      { fields: ['created_at'] }
    ]
  });
  return VisitLog;
};
