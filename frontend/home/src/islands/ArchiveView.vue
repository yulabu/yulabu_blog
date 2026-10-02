<template>
  <main class="archive-main">
    <GlassPanel class="archive-card">
      <div class="archive-header">
        <h1 class="archive-title">文章年份列表</h1>
        <span v-if="totalPosts > 0" class="total-count">共 {{ totalPosts }} 篇</span>
      </div>

      <Skeleton v-if="loading" variant="row" :count="4" />

      <ContentState
        v-else-if="error"
        kind="error"
        size="panel"
        retry-text="重新加载"
        @retry="fetchArchive"
      >
        {{ error }}
      </ContentState>

      <ContentState v-else-if="archives.length === 0" kind="empty" size="panel">
        暂无文章
      </ContentState>

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
                <a
                  v-for="post in month.posts"
                  :key="post.id"
                  class="post-item"
                  :href="`/post/${post.id}`"
                  @click="markPostSplash(post)"
                >
                  <div class="date-badge">
                    <span class="day">{{ dayOf(post.createdAt) }}</span>
                    <span class="month">{{ monthOf(post.createdAt) }}月</span>
                  </div>
                  <div class="post-info">
                    <h3 class="post-title">{{ post.title }}</h3>
                    <p class="post-summary card-text">{{ post.summary || '暂无摘要' }}</p>
                    <div class="post-meta">
                      <CategoryChip v-if="post.category">{{ post.category.name }}</CategoryChip>
                      <span class="views">
                        <AppIcon icon="material-symbols:visibility-outline" class="view-icon" />
                        {{ formatViewCount(post.viewCount) }}
                      </span>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlassPanel>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import CategoryChip from '@/components/ui/CategoryChip.vue'
import ContentState from '@/components/ui/ContentState.vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { getArchive } from '@/api/post'
import { formatViewCount } from '@/utils/format'
import { formatDayMonth } from '@/utils/date'
import { markPostSplash } from '@/utils/postSplash'
import { createSilentSync } from '@/utils/liveData'

const props = defineProps({
  // 构建期烘焙的归档（archive.astro 注入），页面必定传入（取数失败传空数组）。
  // 不写 default：Astro 对 JS SFC 的函数式 default 会破坏 .vue 的类型生成
  initialArchives: { type: Array }
})

// 有烘焙数据就直接渲染 → 预渲染 HTML 里就有内容，首屏不闪「加载中」
const archives = ref(props.initialArchives || [])
const loading = ref(!archives.value.length)
const error = ref('')
const expandedYears = ref({})
if (archives.value.length) markYearsExpanded(archives.value)

const totalPosts = computed(() => {
  return archives.value.reduce((sum, year) => sum + year.count, 0)
})

// 归档默认全部展开
function markYearsExpanded(list) {
  list.forEach((year) => {
    expandedYears.value[year.year] = true
  })
}

// 指纹只需覆盖「结构 + 篇数」：发文会改 count 或新增月份，都会被察觉
function fingerprintOf(list) {
  return (list ?? [])
    .map((y) => `${y.year}:${y.count}:${y.months.map((m) => `${m.month}:${m.count}`).join('.')}`)
    .join(',')
}

function applyArchives(list) {
  archives.value = list
  markYearsExpanded(list)
}

// 水合后静默对账：指纹一致则完全不动 DOM
const silentSync = createSilentSync({
  baked: fingerprintOf(props.initialArchives),
  load: async () => (await getArchive()).archives || [],
  key: fingerprintOf,
  apply: applyArchives
})

// 日期按北京时间取部件（utils/date 的 formatDayMonth）：无效日期给占位而不是 NaN
function dayOf(date) {
  return formatDayMonth(date).day
}

function monthOf(date) {
  return formatDayMonth(date).month
}

function toggleYear(year) {
  expandedYears.value[year] = !expandedYears.value[year]
}

async function fetchArchive() {
  loading.value = true
  error.value = ''
  try {
    applyArchives((await getArchive()).archives || [])
  } catch (e) {
    error.value = '归档加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (archives.value.length) silentSync()
  else fetchArchive()
})
</script>

<style scoped>
/* 页面骨架（含左栏空位与常驻个人卡片）已上移到 Astro 层
   （pages/archive.astro + components/astro/PageFrame.astro），
   本组件只负责主内容本身 */
.archive-main {
  min-width: 0;
}

.archive-card {
  padding: 28px 32px;
  border-radius: 16px;
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
      var(--bg-glass-start),
      var(--bg-glass-mid),
      var(--bg-glass-end));
  border-top: 1px solid var(--border-light);
  border-left: 1px solid var(--border-light);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
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

/* 摘要排版在 .card-text（styles/components.css），字体族是有意保留的现状 */
.post-summary {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: auto;
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

@media (max-width: 768px) {
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
