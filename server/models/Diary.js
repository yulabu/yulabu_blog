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
      comment: '图片URL数组（单图：images[0] 即封面）',
      get() {
        const raw = this.getDataValue('images');
        if (typeof raw === 'string') {
          try { return JSON.parse(raw); } catch { return []; }
        }
        return raw || [];
      }
    },
    cover_image_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: '封面图片ID（由 images[0] 派生，供 GC 对账）'
    }
  }, {
    tableName: 'diary',
    timestamps: true,
    underscored: true
  });
  return Diary;
};
