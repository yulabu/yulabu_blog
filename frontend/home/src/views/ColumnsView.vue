<template>
  <div class="page-bg">
    <header class="top-banner">
      <WelcomeBanner :show-typing="false" subtitle="专栏" />
    </header>

    <main class="columns-layout">
      <div v-if="loading" class="state">加载中...</div>
      <div v-else-if="columns.length === 0" class="state">暂无专栏</div>

      <div v-else class="columns-grid">
        <div
          v-for="column in columns"
          :key="column.id"
          class="column-card"
          @click="goDetail(column.id)"
        >
          <div class="card-cover">
            <img
              v-if="column.cover"
              :src="column.cover"
              :alt="column.name"
              class="cover-img"
              loading="lazy"
            />
            <div v-else class="cover-fallback">{{ column.name.charAt(0) }}</div>
            <span class="cover-count">{{ column.post_count }} 篇</span>
          </div>

          <div class="card-info">
            <h3 class="card-name">{{ column.name }}</h3>
            <p class="card-desc">{{ column.desc || '这个专栏还没有简介' }}</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getColumns } from '@/api/column'
import { useMessageBox } from '@/composables/useMessageBox'
import WelcomeBanner from '@/components/home/WelcomeBanner.vue'

const router = useRouter()
const { toast } = useMessageBox()
const columns = ref([])
const loading = ref(true)

function goDetail(id) {
  router.push(`/columns/${id}`)
}

onMounted(async () => {
  try {
    columns.value = await getColumns()
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

.columns-layout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px var(--page-padding) 60px;
}

.state {
  text-align: center;
  padding: 60px 0;
  color: var(--color-text);
  opacity: 0.6;
  font-size: 14px;
}

.columns-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.column-card {
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(to right bottom,
      var(--bg-glass-start),
      var(--bg-glass-mid),
      var(--bg-glass-end));
  backdrop-filter: blur(16px);
  border-top: 1px solid var(--border-light);
  border-left: 1px solid var(--border-light);
  box-shadow: 0 4px 12px var(--shadow-color);
  cursor: pointer;
  transition: transform 0.25s, box-shadow 0.25s;
  display: flex;
  flex-direction: column;
}

.column-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px var(--shadow-color);
}

.card-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: rgba(var(--color-primary-rgb), 0.08);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.column-card:hover .cover-img {
  transform: scale(1.05);
}

.cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  font-weight: 700;
  color: rgba(var(--color-primary-rgb), 0.4);
}

.cover-count {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 2px 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.45);
  color: white;
  font-size: 12px;
  backdrop-filter: blur(4px);
}

.card-info {
  padding: 14px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-name {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
}

.card-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>