function adminProfile(admin) {
  return {
    id: admin.admin_id,
    name: admin.admin_name,
    avatar: admin.admin_avatar || '',
    created_at: admin.created_at,
    updated_at: admin.updated_at
  };
}

function adminListItem(admin) {
  return adminProfile(admin);
}

module.exports = {
  adminProfile,
  adminListItem
};
