<template>
  <section class="post-list">
    <h3 class="section-title">最新文章</h3>
    <article v-for="post in posts" :key="post.id" class="post-card">
      <div class="cover"></div>
      <div class="info">
        <h4>{{ post.title }}</h4>
        <p class="excerpt">{{ post.excerpt }}</p>
        <div class="meta">
          <span class="date">{{ post.date }}</span>
          <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>
      </div>
    </article>
  </section>
</template>
<script setup>
const posts = [
  {
    id: 1,
    title: '开始搭建我的个人博客',
    excerpt: '从零开始，使用 Vue3 + Vite 一步步搭建属于自己的博客站点...',
    date: '2026-06-20',
    tags: ['Vue3', '博客']
  },
  {
    id: 2,
    title: '登录页面的设计思路',
    excerpt: '记录了登录页从设计稿到实现的完整过程，包括玻璃拟态和动画效果...',
    date: '2026-06-22',
    tags: ['CSS', '设计']
  },
  {
    id: 3,
    title: 'Vue Router 路由配置笔记',
    excerpt: '整理了 Vue Router 的基本用法、路由守卫和页面懒加载的实现方式...',
    date: '2026-06-23',
    tags: ['Vue', 'Router']
  }
]
</script>
<style scoped>
.post-list{
    background-color: bisque;
}
</style>