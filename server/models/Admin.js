module.exports = (sequelize, DataTypes) => {
  const Admin = sequelize.define('Admin', {
    admin_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    admin_name: {
      type: DataTypes.STRING(24),
      allowNull: false,
      unique: true,
      comment: '管理员用户名'
    },
    admin_password: {
      type: DataTypes.STRING(128),
      allowNull: false,
      comment: '加密后的密码'
    },
    admin_avatar: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '头像URL'
    }
  }, {
    tableName: 'admin',
    timestamps: true,
    underscored: true
  });
  return Admin;
};