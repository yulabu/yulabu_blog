module.exports = (sequelize, DataTypes) => {
  const PostImage = sequelize.define('PostImage', {
    post_image_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: '文章ID'
    },
    image_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: '正文图片ID（引用 image 表）'
    }
  }, {
    tableName: 'post_image',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['post_id', 'image_id'] },
      { fields: ['image_id'] }
    ]
  });
  return PostImage;
};
