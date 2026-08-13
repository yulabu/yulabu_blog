module.exports = (sequelize, DataTypes) => {
  const Moment = sequelize.define('Moment', {
    moment_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    moment_content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '内容'
    },
    moment_image: {
      type: DataTypes.STRING(512),
      allowNull: true,
      comment: '配图URL'
    },
    moment_status: {
      type: DataTypes.ENUM('show', 'hide'),
      defaultValue: 'show',
      comment: '显示状态'
    }
  }, {
    tableName: 'moment',
    timestamps: true,
    underscored: true
  });
  return Moment;
};
