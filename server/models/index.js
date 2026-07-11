const sequelize = require('../config/database');
const DataTypes = require('sequelize').DataTypes;

const Tag = require('./Tag')(sequelize, DataTypes);
const Post = require('./Post')(sequelize, DataTypes);
const Admin = require('./Admin')(sequelize, DataTypes);

// 关联：一个 Tag 下有多个 Post（外键 post_category_id → tag_id）
Tag.hasMany(Post, { foreignKey: 'post_category_id', as: 'posts' });
Post.belongsTo(Tag, { foreignKey: 'post_category_id', as: 'category' });

module.exports = { sequelize, Post, Tag, Admin };