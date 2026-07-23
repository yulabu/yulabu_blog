<template>
  <aside class="sidebar">
    <div class="brand">
      <span class="logo">Yulabu</span>
    </div>

    <nav class="menu">
      <router-link to="/admin/dashboard" class="menu-item" active-class="active">
        <Icon icon="material-symbols:dashboard-outline" class="menu-icon" />
        <span>工作台</span>
      </router-link>

      <div class="menu-group">
        <span class="group-title">内容管理</span>
        <router-link to="/admin/posts" class="menu-item" active-class="active">
          <Icon icon="material-symbols:article-outline" class="menu-icon" />
          <span>文章管理</span>
        </router-link>
        <router-link to="/admin/tags" class="menu-item" active-class="active">
          <Icon icon="material-symbols:label-outline" class="menu-icon" />
          <span>标签管理</span>
        </router-link>
      </div>

      <router-link to="/admin/settings" class="menu-item" active-class="active">
        <Icon icon="material-symbols:settings-outline" class="menu-icon" />
        <span>系统设置</span>
      </router-link>
    </nav>

  </aside>
</template>

<script setup>
import { Icon } from '@iconify/vue'
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 220px;
  background: #ffffff;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.brand {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.logo {
  font-family: '华文琥珀', 'STHupo', sans-serif;
  font-size: 24px;
  color: rgb(99, 149, 86);
  letter-spacing: 2px;
}

.menu {
  flex: 1;
  padding: 12px 0;
  overflow-y: auto;
}

.menu-group {
  margin-bottom: 8px;
}

.group-title {
  display: block;
  padding: 16px 20px 8px;
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  margin: 2px 12px;
  border-radius: 8px;
  color: #666;
  font-size: 14px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.menu-item:hover {
  background: rgba(99, 149, 86, 0.06);
  color: rgb(45, 90, 65);
}

.menu-item.active {
  background: rgba(99, 149, 86, 0.1);
  color: rgb(45, 90, 65);
  position: relative;
}

.menu-item.active::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background: rgb(99, 149, 86);
  border-radius: 0 2px 2px 0;
}

.menu-icon {
  font-size: 18px;
  flex-shrink: 0;
}
</style>
