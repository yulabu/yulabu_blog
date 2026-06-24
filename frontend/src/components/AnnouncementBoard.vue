<template>
  <div class="card">
    <h4 class="title">公告</h4>
    <div v-for="item in announcements" :key="item.id" class="item">
      <span class="dot"></span>
      <span class="content">{{ item.content }}</span>
    </div>
  </div>
</template>
<script setup>
const announcements = [
  { id: 1, content: '博客正在建设中，欢迎访问！' },
  { id: 2, content: '登录功能已上线，赶紧试试吧。' },
  { id: 3, content: '更多功能即将推出，敬请期待。' }
]
</script>
<style scoped>
.card{
    background-color: darkgoldenrod;
}
</style>