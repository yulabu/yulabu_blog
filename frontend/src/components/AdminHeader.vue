<template>
  <header class="admin-header">
    <div class="header-inner">
      <div class="left">
        <span class="brand">Yulabu 后台</span>
        <router-link to="/home" class="nav-link">返回博客</router-link>
      </div>
      <div class="right">
        <router-link to="/admin" class="nav-link">文章管理</router-link>
      </div>
    </div>
  </header>
</template>

<style scoped>
.admin-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 60px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.header-inner {
  max-width: 1280px;
  margin: 0 auto;
  height: 100%;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.brand {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: rgb(45, 90, 65);
  letter-spacing: 1px;
}

.nav-link {
  font-size: 14px;
  color: rgb(65, 110, 105);
  text-decoration: none;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: rgb(45, 90, 65);
}

.right {
  display: flex;
  align-items: center;
  gap: 16px;
}
</style>
