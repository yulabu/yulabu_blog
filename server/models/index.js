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
const PostImage = require('./PostImage')(sequelize, DataTypes);
const DailyStat = require('./DailyStat')(sequelize, DataTypes);

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

// 关联：文章 <-> 正文图片（通过 post_image 关联表，保存文章时全量同步）
Post.hasMany(PostImage, { foreignKey: 'post_id', as: 'postImages' });
PostImage.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });
PostImage.belongsTo(Image, { foreignKey: 'image_id', as: 'image' });

// 关联：文章封面 -> image。cover_image_id 列早已存在（由 post_cover 派生，供 GC 对账），
// 这里只补关联声明，**不产生任何 ALTER / 不需要 sync-schema**。用途单一：列表 VO 取
// 400px 缩略图路径（image.thumb_path）给列表小卡当封面，大图卡仍用 post_cover 原图。
Post.belongsTo(Image, { foreignKey: 'cover_image_id', as: 'coverImage' });

// DailyStat 无关联：由日期键自持的每日聚合，不与其他业务表 join

module.exports = { sequelize, Post, Tag, Admin, FriendLink, Column, ColumnPost, Image, VisitLog, Diary, PostImage, DailyStat };