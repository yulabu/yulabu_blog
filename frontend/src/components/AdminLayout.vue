<template>
  <div class="admin-layout">
    <AdminHeader />
    <main class="admin-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import AdminHeader from './AdminHeader.vue'
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background-color: rgb(202, 242, 203);
}

.admin-main {
  max-width: 1280px;
  margin: 0 auto;
  padding: 84px 24px 40px;
}
</style>
