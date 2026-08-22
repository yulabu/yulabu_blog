<template>
  <div class="page-bg">
    <header class="top-banner">
      <WelcomeBanner :show-typing="false" subtitle="专栏详情" />
    </header>

    <div class="column-detail-layout">
      <div v-if="loading" class="state">加载中...</div>
      <div v-else-if="!column" class="state">专栏不存在</div>

      <template v-else>
        <div class="column-header">
          <img v-if="column.cover" :src="column.cover" :alt="column.name" class="header-cover" />
          <div v-else class="header-cover fallback">{{ column.name.charAt(0) }}</div>
          <div class="header-info">
            <h1 class="header-name">{{ column.name }}</h1>
            <p v-if="column.desc" class="header-desc">{{ column.desc }}</p>
            <span class="header-count">共 {{ column.posts.length }} 篇文章</span>
          </div>
        </div>

        <div class="posts-card">
          <div v-if="column.posts.length === 0" class="state">专栏内暂无文章</div>
          <div
            v-else
            v-for="(post, index) in column.posts"
            :key="post.id"
            class="post-item"
            @click="goDetail(post.id)"
          >
            <span class="post-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div class="post-info">
              <h3 class="post-title">{{ post.title }}</h3>
              <p class="post-summary">{{ post.summary || '暂无摘要' }}</p>
              <div class="post-meta">
                <span v-if="post.category" class="category-tag">{{ post.category.name }}</span>
                <span class="post-date">{{ formatDate(post.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getColumnDetail } from '@/api/column'
import { formatDate } from '@/utils/date'
import { useMessageBox } from '@/composables/useMessageBox'
import WelcomeBanner from '@/components/home/WelcomeBanner.vue'

const route = useRoute()
const router = useRouter()
const { toast } = useMessageBox()

const column = ref(null)
const loading = ref(true)

function goDetail(id) {
  router.push(`/post/${id}`)
}

onMounted(async () => {
  try {
    column.value = await getColumnDetail(Number(route.params.id))
  } catch (e) {
    toast('获取专栏失败', 'error')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-bg {
  width: 100%;
  min-height: 100vh;
  background-color: var(--bg-page);
}

.top-banner {
  width: 100%;
}

.column-detail-layout {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px var(--page-padding) 60px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.state {
  text-align: center;
  padding: 60px 0;
  color: var(--color-text);
  opacity: 0.6;
  font-size: 14px;
}

.column-header {
  display: flex;
  gap: 20px;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 12px var(--shadow-color);
  border-top: 1px solid var(--border-light);
  border-left: 1px solid var(--border-light);
  background: linear-gradient(to right bottom,
      var(--bg-glass-start),
      var(--bg-glass-mid),
      var(--bg-glass-end));
  backdrop-filter: blur(16px);
}

.header-cover {
  width: 160px;
  height: 100px;
  object-fit: cover;
  border-radius: 12px;
  flex-shrink: 0;
}

.header-cover.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 700;
  color: rgba(var(--color-primary-rgb), 0.4);
  background: rgba(var(--color-primary-rgb), 0.08);
}

.header-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.header-name {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
}

.header-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text);
  line-height: 1.6;
}

.header-count {
  font-size: 12px;
  color: var(--color-text);
  background: rgba(var(--color-accent-rgb), 0.12);
  padding: 2px 10px;
  border-radius: 10px;
  align-self: flex-start;
}

.posts-card {
  padding: 16px;
  border-radius: 16px;
  box-shadow: 0 4px 12px var(--shadow-color);
  border-top: 1px solid var(--border-light);
  border-left: 1px solid var(--border-light);
  background: linear-gradient(to right bottom,
      var(--bg-glass-start),
      var(--bg-glass-mid),
      var(--bg-glass-end));
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-item {
  display: flex;
  gap: 16px;
  padding: 14px;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
}

.post-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-color);
  background: rgba(var(--color-primary-rgb), 0.06);
}

.post-index {
  flex-shrink: 0;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  padding-top: 2px;
}

.post-info {
  flex: 1;
  min-width: 0;
}

.post-title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 6px;
}

.post-summary {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--color-text);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-tag {
  padding: 2px 10px;
  border-radius: 10px;
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-text);
  font-size: 11px;
}

.post-date {
  font-size: 11px;
  color: var(--color-muted);
}

@media (max-width: 768px) {
  .column-header {
    flex-direction: column;
  }

  .header-cover {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }

  .post-item {
    gap: 10px;
  }

  .post-index {
    font-size: 16px;
  }
}
</style>