<template>
  <div class="dashboard-page">
    <header class="page-header">
      <h1 class="page-title">{{ greeting }}，{{ adminName }}</h1>
      <p class="page-subtitle">{{ currentDateText }} {{ currentTime }}</p>
    </header>

    <section class="stats-grid">
      <div class="stat-card" @click="router.push('/admin/posts')">
        <div class="stat-icon">
          <Icon icon="material-symbols:today-outline" />
        </div>
        <div class="stat-info">
          <div class="stat-label">今日新增</div>
          <div class="stat-value">{{ stats.todayCount }}</div>
        </div>
      </div>

      <div class="stat-card" @click="router.push('/admin/posts')">
        <div class="stat-icon">
          <Icon icon="material-symbols:article-outline" />
        </div>
        <div class="stat-info">
          <div class="stat-label">文章总数</div>
          <div class="stat-value">{{ stats.totalCount }}</div>
        </div>
      </div>

      <div class="stat-card" @click="router.push('/admin/posts')">
        <div class="stat-icon">
          <Icon icon="material-symbols:check-circle-outline" />
        </div>
        <div class="stat-info">
          <div class="stat-label">已发布</div>
          <div class="stat-value">{{ stats.publishedCount }}</div>
        </div>
      </div>

      <div class="stat-card" @click="router.push('/admin/trash')">
        <div class="stat-icon">
          <Icon icon="material-symbols:delete-outline" />
        </div>
        <div class="stat-info">
          <div class="stat-label">回收站</div>
          <div class="stat-value">{{ stats.trashCount }}</div>
        </div>
      </div>
    </section>

    <section class="main-grid">
      <div class="card recent-posts">
        <div class="card-header">
          <h2 class="card-title">
            <Icon icon="material-symbols:schedule-outline" class="title-icon" />
            最近文章
          </h2>
          <button class="btn-text" @click="router.push('/admin/posts')">查看全部</button>
        </div>

        <div v-if="loading" class="loading">加载中...</div>

        <ul v-else-if="recentPosts.length" class="post-list">
          <li
            v-for="post in recentPosts"
            :key="post.id"
            class="post-item"
            @click="router.push(`/admin/posts/${post.id}/edit`)"
          >
            <div class="post-main">
              <span class="post-title">{{ post.title }}</span>
              <span v-if="post.category" class="post-category">{{ post.category.name }}</span>
            </div>
            <span class="post-date">{{ formatDate(post.createdAt) }}</span>
          </li>
        </ul>

        <div v-else class="empty">暂无最近文章</div>
      </div>

      <aside class="right-column">
        <div class="calendar-wrapper">
          <Calendar @select="onDateSelect" />
        </div>

        <div class="card quick-actions">
          <h2 class="card-title">快捷操作</h2>
          <div class="action-buttons">
            <button class="action-btn" @click="router.push('/admin/posts/new')">
              <Icon icon="material-symbols:edit-square-outline" />
              <span>新建文章</span>
            </button>
            <button class="action-btn" @click="router.push('/admin/notices/new')">
              <Icon icon="material-symbols:campaign-outline" />
              <span>发布公告</span>
            </button>
            <button class="action-btn" @click="router.push('/admin/users')">
              <Icon icon="material-symbols:shield-person-outline" />
              <span>用户权限</span>
            </button>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { authFetch } from '@/utils/request'
import Calendar from '@/components/Calendar.vue'

const router = useRouter()

const adminName = ref('管理员')
const loading = ref(false)
const stats = ref({
  todayCount: 0,
  totalCount: 0,
  publishedCount: 0,
  trashCount: 0
})
const recentPosts = ref([])

const currentTime = ref('')
let timer = null

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const currentDateText = computed(() => {
  const d = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
})

function updateTime() {
  const d = new Date()
  currentTime.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  try {
    const admin = JSON.parse(localStorage.getItem('admin') || '{}')
    adminName.value = admin.name || '管理员'
  } catch {
    adminName.value = '管理员'
  }

  updateTime()
  timer = setInterval(updateTime, 1000 * 60)

  fetchDashboard()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

async function fetchDashboard() {
  loading.value = true
  try {
    const res = await authFetch('/api/admin/dashboard')
    if (!res.ok) throw new Error('获取工作台数据失败')
    const data = await res.json()
    stats.value = {
      todayCount: data.todayCount || 0,
      totalCount: data.totalCount || 0,
      publishedCount: data.publishedCount || 0,
      trashCount: data.trashCount || 0
    }
    recentPosts.value = data.recentPosts || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function formatDate(str) {
  if (!str) return '-'
  const d = new Date(str)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function onDateSelect(date) {
  // 预留：后续可按日期筛选文章
  console.log('selected date:', date)
}
</script>

<style scoped>
.dashboard-page {
  width: 100%;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 24px;
  font-weight: 600;
  color: rgb(45, 90, 65);
  margin: 0 0 6px;
}

.page-subtitle {
  font-size: 14px;
  color: rgb(120, 140, 125);
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-top: 1px solid white;
  border-left: 1px solid white;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, .6),
      rgba(255, 255, 255, .3),
      rgba(255, 255, 255, .2));
  backdrop-filter: blur(16px);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.stat-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(99, 149, 86, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: rgb(99, 149, 86);
}

.stat-label {
  font-size: 13px;
  color: rgb(120, 140, 125);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: rgb(45, 90, 65);
}

.main-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  align-items: start;
}

.card {
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-top: 1px solid white;
  border-left: 1px solid white;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, .6),
      rgba(255, 255, 255, .3),
      rgba(255, 255, 255, .2));
  backdrop-filter: blur(16px);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: rgb(45, 90, 65);
  margin: 0;
}

.title-icon {
  font-size: 22px;
}

.btn-text {
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: rgb(99, 149, 86);
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.btn-text:hover {
  background: rgba(99, 149, 86, 0.1);
}

.loading,
.empty {
  padding: 40px 0;
  text-align: center;
  color: rgb(120, 140, 125);
  font-size: 14px;
}

.post-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.post-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px dashed rgba(80, 140, 134, 0.2);
  cursor: pointer;
  transition: background 0.2s ease;
}

.post-item:last-child {
  border-bottom: none;
}

.post-item:hover .post-title {
  color: rgb(99, 149, 86);
}

.post-main {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
}

.post-title {
  font-size: 14px;
  color: rgb(45, 90, 65);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.post-category {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(99, 149, 86, 0.85);
  color: white;
  font-size: 12px;
}

.post-date {
  flex-shrink: 0;
  font-size: 13px;
  color: rgb(120, 140, 125);
}

.right-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.calendar-wrapper {
  border-radius: 0 0 30px 30px;
  overflow: hidden;
}

.quick-actions .action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  background: rgba(99, 149, 86, 0.1);
  color: rgb(45, 90, 65);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.action-btn:hover {
  background: rgba(99, 149, 86, 0.2);
}

.action-btn span {
  font-size: 13px;
}

@media (max-width: 960px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .main-grid {
    grid-template-columns: 1fr;
  }
}
</style>
