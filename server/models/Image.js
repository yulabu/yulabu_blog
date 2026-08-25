module.exports = (sequelize, DataTypes) => {
    const Image = sequelize.define('Image', {
        image_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: '主键'
        },
        reference_type: {
            type: DataTypes.ENUM('post_content', 'cover', 'friend_link', 'other'),
            allowNull: false,
            defaultValue: 'post_content',
            comment: '引用类型'
        },
        reference_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            comment: '引用对象ID，NULL 表示已解绑（孤儿）'
        },
        storage_path: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: '相对 uploads 的存储路径（key）'
        },
        thumb_path: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: '缩略图相对路径'
        },
        file_size: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '原图字节数（统计存储占用）'
        }
    }, {
        tableName: 'image',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['reference_type', 'reference_id'] },
            { fields: ['created_at'] }
        ]
    });
    return Image;
}