<template>
  <div class="page-bg">
    <header class="top-banner">
      <WelcomeBanner :show-typing="false" subtitle="文章归档" />
    </header>
    <div class="archive-layout">
      <aside class="archive-sidebar">
        <!-- 左侧预留空位 -->
      </aside>
      <main class="archive-main">
        <div class="archive-card">
          <div class="archive-header">
            <h1 class="archive-title">文章年份列表</h1>
            <span v-if="totalPosts > 0" class="total-count">共 {{ totalPosts }} 篇</span>
          </div>

          <div v-if="loading" class="state">加载中...</div>
          <div v-else-if="archives.length === 0" class="state">暂无文章</div>

          <div v-else class="year-list">
            <div
              v-for="year in archives"
              :key="year.year"
              class="year-section"
            >
              <div class="year-title" @click="toggleYear(year.year)">
                <span class="arrow" :class="{ expanded: expandedYears[year.year] }">▶</span>
                <span class="year-text">{{ year.year }} 年</span>
                <span class="year-count">（{{ year.count }} 篇）</span>
              </div>

              <div v-show="expandedYears[year.year]" class="year-content">
                <div
                  v-for="month in year.months"
                  :key="month.month"
                  class="month-section"
                >
                  <div class="month-title">{{ month.month }} 月</div>
                  <div class="post-list">
                    <div
                      v-for="post in month.posts"
                      :key="post.id"
                      class="post-item"
                      @click="goToDetail(post.id)"
                    >
                      <div class="date-badge">
                        <span class="day">{{ formatDay(post.createdAt) }}</span>
                        <span class="month">{{ formatMonth(post.createdAt) }}月</span>
                      </div>
                      <div class="post-info">
                        <h3 class="post-title">{{ post.title }}</h3>
                        <p class="post-summary">{{ post.summary || '暂无摘要' }}</p>
                        <div class="post-meta">
                          <span v-if="post.category" class="category-tag">{{ post.category.name }}</span>
                          <span class="views">
                            <Icon icon="material-symbols:visibility-outline" class="view-icon" />
                            0
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { getArchive } from '@/api/post'
import { useMessageBox } from '@/composables/useMessageBox'
import WelcomeBanner from '@/components/home/WelcomeBanner.vue'

const router = useRouter()
const { toast } = useMessageBox()

const archives = ref([])
const loading = ref(true)
const expandedYears = ref({})

const totalPosts = computed(() => {
  return archives.value.reduce((sum, year) => sum + year.count, 0)
})

function formatDay(date) {
  return String(new Date(date).getDate()).padStart(2, '0')
}

function formatMonth(date) {
  return new Date(date).getMonth() + 1
}

function toggleYear(year) {
  expandedYears.value[year] = !expandedYears.value[year]
}

function goToDetail(id) {
  router.push(`/post/${id}`)
}

async function fetchArchive() {
  try {
    const data = await getArchive()
    archives.value = data.archives || []
    // 默认全部展开
    archives.value.forEach((year) => {
      expandedYears.value[year.year] = true
    })
  } catch (e) {
    toast('获取归档失败', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(fetchArchive)
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

.archive-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px 24px 60px;
}

.archive-sidebar {
  min-height: 200px;
}

.archive-main {
  min-width: 0;
}

.archive-card {
  padding: 28px 32px;
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

.archive-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px dashed var(--border-divider);
  margin-bottom: 24px;
}

.archive-title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0;
}

.total-count {
  font-size: 13px;
  color: var(--color-text);
  background: rgba(var(--color-accent-rgb), 0.12);
  padding: 4px 12px;
  border-radius: 12px;
}

.state {
  text-align: center;
  padding: 40px 0;
  color: var(--color-text);
  opacity: 0.6;
  font-size: 14px;
}

.year-section {
  margin-bottom: 16px;
}

.year-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}

.year-title:hover {
  color: var(--color-primary);
}

.arrow {
  font-size: 12px;
  color: var(--color-muted);
  transition: transform 0.2s;
}

.arrow.expanded {
  transform: rotate(90deg);
}

.year-text {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-heading);
}

.year-count {
  font-size: 13px;
  color: var(--color-muted);
}

.month-section {
  padding-left: 24px;
  margin-bottom: 20px;
}

.month-title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid var(--color-primary);
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.post-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, 0.4),
      rgba(255, 255, 255, 0.2));
  border-top: 1px solid var(--border-light);
  border-left: 1px solid var(--border-light);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.post-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-color);
}

.date-badge {
  flex-shrink: 0;
  width: 56px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary), rgba(var(--color-primary-rgb), 0.75));
  color: white;
  box-shadow: 0 4px 10px rgba(var(--color-primary-rgb), 0.3);
}

.day {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.month {
  font-size: 12px;
  margin-top: 4px;
  opacity: 0.9;
}

.post-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.post-title {
  font-family: 'LXGW WenKai', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: var(--color-primary);
  margin: 0;
  line-height: 1.4;
  transition: color 0.2s;
}

.post-item:hover .post-title {
  color: var(--color-primary-hover);
}

.post-summary {
  margin: 0;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
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
  gap: 12px;
  margin-top: auto;
}

.category-tag {
  padding: 3px 10px;
  border-radius: 10px;
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-text);
  font-size: 12px;
}

.views {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-muted);
}

.view-icon {
  font-size: 14px;
}

@media (max-width: 1024px) {
  .archive-layout {
    grid-template-columns: 1fr;
  }

  .archive-sidebar {
    display: none;
  }
}

@media (max-width: 640px) {
  .archive-card {
    padding: 20px;
  }

  .post-item {
    gap: 12px;
  }

  .date-badge {
    width: 48px;
    height: 56px;
  }

  .day {
    font-size: 20px;
  }

  .post-title {
    font-size: 16px;
  }
}
</style>
