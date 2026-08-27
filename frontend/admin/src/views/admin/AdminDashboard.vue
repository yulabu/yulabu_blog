<template>
  <div class="dashboard-page">
    <section class="top-section">
      <DashboardWelcomeCard :admin-name="adminName" />

      <div class="stats-grid-compact">
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

        <div class="stat-card" @click="router.push('/admin/posts')">
          <div class="stat-icon">
            <Icon icon="material-symbols:delete-outline" />
          </div>
          <div class="stat-info">
            <div class="stat-label">回收站</div>
            <div class="stat-value">{{ stats.trashCount }}</div>
          </div>
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
          <AdminButton variant="text" @click="router.push('/admin/posts')">查看全部</AdminButton>
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

        <div class="calendar-wrapper">
          <Calendar />
        </div>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import { useMessageBox } from '@/composables/useMessageBox'
import { getDashboard } from '@/api/admin'
import { formatDate } from '@/utils/date'
import Calendar from '@/components/admin/Calendar.vue'
import DashboardWelcomeCard from '@/components/admin/DashboardWelcomeCard.vue'
import AdminButton from '@/components/admin/AdminButton.vue'

const router = useRouter()
const authStore = useAuthStore()
const { toast } = useMessageBox()

const adminName = computed(() => authStore.admin?.name || '管理员')
const loading = ref(false)
const stats = ref({
  todayCount: 0,
  totalCount: 0,
  publishedCount: 0,
  trashCount: 0
})
const recentPosts = ref([])

onMounted(() => {
  fetchDashboard()
})

async function fetchDashboard() {
  loading.value = true
  try {
    const data = await getDashboard()
    stats.value = {
      todayCount: data.todayCount || 0,
      totalCount: data.totalCount || 0,
      publishedCount: data.publishedCount || 0,
      trashCount: data.trashCount || 0
    }
    recentPosts.value = data.recentPosts || []
  } catch (e) {
    toast('获取工作台数据失败', 'error')
  } finally {
    loading.value = false
  }
}

</script>

<style scoped>
.dashboard-page {
  width: 100%;
}

.top-section {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: 20px;
  margin-bottom: 24px;
  align-items: stretch;
}

.stats-grid-compact {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
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
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(var(--color-primary-rgb), 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--color-primary);
}

.stat-label {
  font-size: 13px;
  color: var(--color-muted);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-heading);
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

.loading,
.empty {
  padding: 40px 0;
  text-align: center;
  color: var(--color-muted);
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
  color: var(--color-primary);
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
  background: rgba(var(--color-primary-rgb), 0.85);
  color: white;
  font-size: 12px;
}

.post-date {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--color-muted);
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
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-heading);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.action-btn:hover {
  background: rgba(var(--color-primary-rgb), 0.2);
}

.action-btn span {
  font-size: 13px;
}

@media (max-width: 960px) {
  .top-section {
    grid-template-columns: 1fr;
  }

  .main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .stats-grid-compact {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
}
</style>
