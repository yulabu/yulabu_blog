module.exports = (sequelize, DataTypes) => {
  const FriendLink = sequelize.define('FriendLink', {
    friend_link_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '友链名称'
    },
    url: {
      type: DataTypes.STRING(256),
      allowNull: false,
      comment: '链接地址'
    },
    avatar: {
      type: DataTypes.STRING(512),
      allowNull: true,
      comment: '头像URL'
    },
    description: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: '简介'
    },
    preview_image: {
      type: DataTypes.STRING(512),
      allowNull: true,
      comment: '预览图URL（相对路径或外链）'
    },
    preview_image_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: '预览图图片ID（引用 image 表，本地抓图时写入，供 GC 对账）'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序（越小越前）'
    },
    status: {
      // draft 追加在末尾：MySQL ENUM 按索引存储，插入前面会导致现有数据错位
      type: DataTypes.ENUM('show', 'hide', 'draft'),
      defaultValue: 'show',
      comment: '显示状态'
    }
  }, {
    tableName: 'friend_link',
    timestamps: true,
    underscored: true
  });
  return FriendLink;
};
