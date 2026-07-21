<template>
  <section class="post-list">
    <div class="header">
      <Icon icon="material-symbols:article-outline" class="icon" />
      <h3 class="section-title">最新文章</h3>
      <span class="count" v-if="posts.length">共 {{ posts.length }} 篇</span>
    </div>
    <div v-if="!posts.length" class="empty">
      <Icon icon="material-symbols:description-off-outline" class="empty-icon" />
      <span>暂无文章</span>
    </div>
    <article v-else v-for="post in posts" :key="post.id" class="post-card" @click="goToDetail(post.id)">
      <div class="post-head">
        <h4 class="title">{{ post.title }}</h4>
        <span v-if="post.category" class="tag">{{ post.category.name }}</span>
      </div>
      <p class="excerpt">{{ post.summary }}</p>
      <div class="meta">
        <span class="author">{{ post.author }}</span>
        <span class="date">{{ formatDate(post.createdAt) }}</span>
      </div>
    </article>
  </section>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

const posts = ref([])
const router = useRouter()

onMounted(async () => {
  try {
    const res = await fetch('/api/posts?limit=20')
    const data = await res.json()
    posts.value = data.posts
  } catch (e) {
    console.error('获取文章列表失败:', e)
  }
})

function goToDetail(id) {
  router.push(`/post/${id}`)
}

function formatDate(str) {
  if (!str) return ''
  const d = new Date(str)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>
<style scoped>
.post-list {
  width: 100%;
  padding: 24px 20px;
  border-radius: 5%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(80, 140, 134, .25);
}

.icon {
  color: rgb(99, 149, 86);
  font-size: 22px;
}

.section-title {
  font-family: '华文琥珀', 'STHupo', sans-serif;
  font-weight: 400;
  color: rgb(99, 149, 86);
  font-size: 20px;
  margin: 0;
  letter-spacing: 2px;
}

.count {
  margin-left: auto;
  font-size: 12px;
  color: rgb(65, 110, 105);
  background: rgba(80, 140, 134, .12);
  padding: 2px 8px;
  border-radius: 10px;
}

.post-card {
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-top: 1px solid white;
  border-left: 1px solid white;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, .48),
      rgba(255, 255, 255, .24),
      rgba(255, 255, 255, .16));
  backdrop-filter: blur(16px);
  transition: transform .2s, box-shadow .2s;
  cursor: pointer;
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
}

.post-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}

.title {
  font-family: '华文琥珀', 'STHupo', sans-serif;
  font-weight: 400;
  font-size: 18px;
  color: rgb(99, 149, 86);
  margin: 0;
  line-height: 1.4;
  transition: color .2s;
}

.post-card:hover .title {
  color: rgb(71, 120, 65);
}

.tag {
  color: white;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  letter-spacing: 1px;
  white-space: nowrap;
  flex-shrink: 0;
  background: rgba(99, 149, 86, 0.85);
}

.excerpt {
  margin: 0 0 10px 0;
  font-family: '微软雅黑', sans-serif;
  font-size: 13px;
  color: rgb(99, 118, 94);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: '微软雅黑', sans-serif;
  font-size: 12px;
}

.date {
  color: rgb(65, 110, 105);
  opacity: .6;
  font-size: 11px;
}

.author {
  color: rgb(65, 110, 105);
  opacity: .65;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  color: rgb(65, 110, 105);
  opacity: .45;
  font-size: 13px;
  gap: 8px;
}

.empty-icon {
  font-size: 32px;
}
</style>