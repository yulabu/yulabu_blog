<template>
  <section class="post-list">
    <h3 class="section-title">最新文章</h3>
    <article v-for="post in posts" :key="post.id" class="post-card">
      <div class="cover"></div>
      <div class="info">
        <h4>{{ post.title }}</h4>
        <p class="excerpt">{{ post.summary }}</p>
        <div class="meta">
          <span class="date">{{ post.createdAt }}</span>
          <span v-for="tag in post.tags" :key="tag" class="tag">{{ post.category.name }}</span>
        </div>
      </div>
    </article>
  </section>
</template>
<script setup>
import { ref, onMounted } from 'vue'

const posts = ref([])

onMounted(async () => {
  try {
    const res = await fetch('/api/posts')
    const data = await res.json()
    posts.value = data.posts
  } catch (e) {
    console.error('获取文章列表失败:', e)
  }
})
</script>
<style scoped>
.post-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}
.post-list{
    background-color: bisque;
}
</style>