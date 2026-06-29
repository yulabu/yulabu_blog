module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define('Post', {
    post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    post_title: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '标题'
    },
    post_content: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      comment: '正文'
    },
    post_summary: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: '摘要'
    },
    post_author: {
      type: DataTypes.STRING(16),
      allowNull: true,
      defaultValue: '匿名',
      comment: '作者'
    },
    post_category_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: '分类ID'
    },
    post_status: {
      type: DataTypes.ENUM('published', 'trash'),
      defaultValue: 'published',
      comment: '文章状态'
    }
  }, {
    tableName: 'post',      // 表名
    timestamps: true,       // 自动添加 createdAt, updatedAt
    underscored: true       // 使用下划线命名 created_at, updated_at
  });
  return Post;
};