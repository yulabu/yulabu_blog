module.exports = (sequelize, DataTypes) => {
  const Diary = sequelize.define('Diary', {
    diary_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '日记内容'
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '图片URL数组',
      get() {
        const raw = this.getDataValue('images');
        if (typeof raw === 'string') {
          try { return JSON.parse(raw); } catch { return []; }
        }
        return raw || [];
      }
    }
  }, {
    tableName: 'diary',
    timestamps: true,
    underscored: true
  });
  return Diary;
};
