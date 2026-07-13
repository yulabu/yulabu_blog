function loginResult(token, admin) {
  return {
    token,
    admin: {
      id: admin.admin_id,
      name: admin.admin_name,
      avatar: admin.admin_avatar,
    },
  };
}

module.exports = { loginResult };