module.exports = (sequelize, DataTypes) => {
    const Image = sequelize.define('Image', {
        image_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: '主键'
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
        },
        orphan_since: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '孤儿标记时间：GC 对账无引用时打标，超宽限期物理删除；重新被引用时清除'
        }
    }, {
        tableName: 'image',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['storage_path'] },
            { fields: ['orphan_since'] },
            { fields: ['created_at'] }
        ]
    });
    return Image;
}
