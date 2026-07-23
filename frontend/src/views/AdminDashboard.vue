<template>
  <div class="placeholder-page">
    <div class="card">
      <Icon icon="material-symbols:dashboard-outline" class="icon" />
      <h2>工作台</h2>
      <p>工作台正在建设中，敬请期待</p>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
</script>

<style scoped>
.placeholder-page {
  padding: 40px 0;
}

.card {
  max-width: 480px;
  margin: 0 auto;
  padding: 48px;
  text-align: center;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.icon {
  font-size: 48px;
  color: rgb(99, 149, 86);
  margin-bottom: 16px;
}

h2 {
  font-size: 20px;
  color: #333;
  margin: 0 0 8px;
}

p {
  font-size: 14px;
  color: #999;
  margin: 0;
}
</style>
