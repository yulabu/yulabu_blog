function adminProfile(admin) {
  return {
    id: admin.admin_id,
    name: admin.admin_name,
    avatar: admin.admin_avatar || '',
    // Sequelize 实例的属性名是 createdAt/updatedAt（underscored 只改列名，不改实例属性）——
    // 改前这里读 admin.created_at 恒为 undefined，两个字段被 JSON 丢掉，后台「创建时间」列一直是空白
    created_at: admin.createdAt,
    updated_at: admin.updatedAt
  };
}

module.exports = { adminProfile };
