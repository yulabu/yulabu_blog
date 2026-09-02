const sequelize = require('@config/database');
const DataTypes = require('sequelize').DataTypes;

const Tag = require('./Tag')(sequelize, DataTypes);
const Post = require('./Post')(sequelize, DataTypes);
const Admin = require('./Admin')(sequelize, DataTypes);
const FriendLink = require('./FriendLink')(sequelize, DataTypes);
const Column = require('./Column')(sequelize, DataTypes);
const ColumnPost = require('./ColumnPost')(sequelize, DataTypes);
const Image = require('./Image')(sequelize, DataTypes);
const VisitLog = require('./VisitLog')(sequelize, DataTypes);
const Diary = require('./Diary')(sequelize, DataTypes);

// 关联：一个 Tag 下有多个 Post（外键 post_category_id → tag_id）
Tag.hasMany(Post, { foreignKey: 'post_category_id', as: 'posts' });
Post.belongsTo(Tag, { foreignKey: 'post_category_id', as: 'category' });

// 关联：专栏 <-> 文章（通过 column_post 关联表，一对多语义由 post_id 唯一约束保证）
Column.hasMany(ColumnPost, { foreignKey: 'column_id', as: 'columnPosts' });
ColumnPost.belongsTo(Column, { foreignKey: 'column_id', as: 'column' });
Post.hasOne(ColumnPost, { foreignKey: 'post_id', as: 'columnPost' });
ColumnPost.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });

// 关联：访问日志 -> 文章
VisitLog.belongsTo(Post, { foreignKey: 'post_id', as: 'Post' });
Post.hasMany(VisitLog, { foreignKey: 'post_id', as: 'visitLogs' });

module.exports = { sequelize, Post, Tag, Admin, FriendLink, Column, ColumnPost, Image, VisitLog, Diary };