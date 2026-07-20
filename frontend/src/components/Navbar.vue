<template>
  <nav class="navbar">
    <div class="nav-brand">
      <span class="logo">Yulabu</span>
    </div>
    <div class="nav-links">
      <router-link to="/" class="nav-link">首页</router-link>
      <router-link to="/articles" class="nav-link">文章</router-link>
      <router-link to="/about" class="nav-link">关于</router-link>
    </div>
    <div class="nav-actions">
      <router-link to="/login" class="nav-link login">登录</router-link>
    </div>
  </nav>
</template>
<script setup>
</script>
<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, .65),
      rgba(255, 255, 255, .45));
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.nav-brand {
  display: flex;
  align-items: center;
}

.logo {
  font-family: '华文琥珀', 'STHupo', sans-serif;
  font-size: 24px;
  color: rgb(99, 149, 86);
  letter-spacing: 2px;
  cursor: pointer;
  transition: color .2s;
}

.logo:hover {
  color: rgb(71, 120, 65);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 28px;
}

.nav-link {
  font-family: '微软雅黑', sans-serif;
  font-size: 14px;
  color: rgb(65, 110, 105);
  text-decoration: none;
  padding: 6px 0;
  position: relative;
  transition: color .2s;
}

.nav-link:hover {
  color: rgb(99, 149, 86);
}

.nav-link.router-link-active {
  color: rgb(99, 149, 86);
  font-weight: 900;
}

.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: rgb(99, 149, 86);
  border-radius: 1px;
}

.nav-actions {
  display: flex;
  align-items: center;
}

.login {
  border: 1px solid rgb(99, 149, 86);
  border-radius: 16px;
  padding: 4px 16px;
  color: rgb(99, 149, 86);
  transition: all .2s;
}

.login:hover {
  background: rgb(99, 149, 86);
  color: white;
}
</style>