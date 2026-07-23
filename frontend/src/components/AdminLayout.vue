<template>
  <div class="admin-layout">
    <AdminSidebar />
    <AdminHeader />
    <main class="admin-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import AdminSidebar from './AdminSidebar.vue'
import AdminHeader from './AdminHeader.vue'
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.admin-main {
  margin-left: 220px;
  margin-top: 60px;
  padding: 24px;
  min-height: calc(100vh - 60px);
}
</style>
