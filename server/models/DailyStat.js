module.exports = (sequelize, DataTypes) => {
  const DailyStat = sequelize.define('DailyStat', {
    // 自然主键：一天一行，让聚合可以靠 ON DUPLICATE KEY 幂等重算（本表刻意不用自增 id）
    stat_date: {
      type: DataTypes.DATEONLY,
      primaryKey: true,
      comment: '统计日期（北京时间 YYYY-MM-DD）'
    },
    pv: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '当日浏览量PV'
    },
    uv: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: '当日独立访客UV（按IP当日去重）'
    }
  }, {
    tableName: 'daily_stat',
    timestamps: true,
    underscored: true
  });

  return DailyStat;
};
