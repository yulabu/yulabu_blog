<template>
  <main class="archive-main">
    <GlassPanel class="archive-card">
      <header class="archive-head">
        <div class="archive-head__copy">
          <span class="archive-kicker" lang="en">Archive</span>
          <h1 class="archive-title">文章归档</h1>
        </div>
        <span v-if="totalPosts > 0" class="archive-count">
          <strong>{{ totalPosts }}</strong>
          <span>篇文章</span>
        </span>
      </header>

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
        <section v-for="year in archives" :key="year.year" class="year-section">
          <h2 class="year-heading">
            <button
              class="year-toggle"
              type="button"
              :aria-expanded="!!expandedYears[year.year]"
              :aria-controls="`year-content-${year.year}`"
              @click="toggleYear(year.year)"
            >
              <span class="year-number">{{ year.year }}</span>
              <span class="year-meta">{{ year.count }} 篇</span>
              <span class="year-chevron" :class="{ 'is-open': expandedYears[year.year] }">
                <AppIcon icon="material-symbols:chevron-right" />
              </span>
            </button>
          </h2>

          <div
            v-show="expandedYears[year.year]"
            :id="`year-content-${year.year}`"
            class="year-content"
          >
            <section v-for="month in year.months" :key="month.month" class="month-section">
              <h3 class="month-heading">
                <span class="month-number">{{ formatMonth(month.month) }}</span>
                <span class="month-unit">月</span>
                <span class="month-rule" aria-hidden="true"></span>
                <span class="month-count">{{ month.count }} 篇</span>
              </h3>

              <div class="post-list">
                <a
                  v-for="post in month.posts"
                  :key="post.id"
                  class="post-row"
                  :href="`/post/${post.id}`"
                  @click="markPostSplash(post)"
                >
                  <span class="post-day">
                    <span class="post-day__num">{{ dayOf(post.createdAt) }}</span>
                    <span class="post-month">{{ monthOf(post.createdAt) }}</span>
                  </span>

                  <div class="post-body">
                    <h4 class="post-title">{{ post.title }}</h4>
                    <p v-if="post.summary" class="post-summary">{{ post.summary }}</p>
                    <div class="post-meta">
                      <CategoryChip v-if="post.category" size="sm">
                        {{ post.category.name }}
                      </CategoryChip>
                      <span class="post-views" :aria-label="`阅读 ${post.viewCount}`">
                        <AppIcon
                          icon="material-symbols:visibility-outline"
                          class="post-views__icon"
                        />
                        {{ formatViewCount(post.viewCount) }}
                      </span>
                    </div>
                  </div>

                  <span class="post-arrow" aria-hidden="true">
                    <AppIcon icon="material-symbols:arrow-forward-rounded" />
                  </span>
                </a>
              </div>
            </section>
          </div>
        </section>
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

// 行内日期只显示日号 + 月份（月份分组已给出上下文，这里保留完整日期便于单行阅读）
function monthOf(date) {
  const month = formatDayMonth(date).month
  return month ? `${month}月` : '--'
}

// 月份分组标签补零（09 月），与年份数字一起构成索引的层级
function formatMonth(month) {
  return String(month).padStart(2, '0')
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
/* 页面骨架（含左栏空位与常驻个人卡片）在 Astro 层
   （pages/archive.astro + components/astro/PageFrame.astro），本组件只负责主内容。
   版式思路：把归档当一本索引来做 —— 年份/月份负责分区，日期列负责定位，
   标题负责可读性；不再给每篇文章套一张玻璃卡（卡套卡会把层级压平）。 */
.archive-main {
  min-width: 0;
}

.archive-card {
  padding: 28px 32px 24px;
  border-radius: 16px;
  /* 全局 reset 给所有元素设了 sans-serif；这里把整张索引的默认字体
     拉回站点 UI 栈，具体标题/日期/花体再由各自规则覆盖 */
  font-family: var(--font-ui);
}

/* ---------- 页头 ---------- */
.archive-head {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border-divider);
}

/* 复用首页列表页头的 72px 主色短线，让两页像同一个系统里的 */
.archive-head::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 72px;
  height: 2px;
  border-radius: 2px;
  background: var(--color-primary);
}

.archive-head__copy {
  min-width: 0;
}

.archive-kicker {
  display: block;
  margin-bottom: 6px;
  color: var(--color-primary-hover);
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 20px;
  font-style: italic;
  font-weight: 600;
  line-height: 1;
}

.archive-title {
  margin: 0;
  color: var(--color-heading);
  font-family: var(--font-kai);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: 0.02em;
}

.archive-count {
  display: inline-flex;
  flex-shrink: 0;
  align-items: baseline;
  gap: 5px;
  padding: 7px 12px;
  border: 1px solid rgba(var(--color-accent-rgb), 0.18);
  border-radius: 12px;
  background: rgba(var(--color-accent-rgb), 0.09);
  color: var(--color-text);
  font-family: var(--font-ui);
  font-size: 11px;
  white-space: nowrap;
}

.archive-count strong,
.archive-count span {
  font-family: var(--font-ui);
}

.archive-count strong {
  color: var(--color-heading);
  font-size: 17px;
  line-height: 1;
}

/* ---------- 年份 ---------- */
.year-list {
  margin-top: 4px;
}

.year-section {
  margin-top: 16px;
}

.year-section + .year-section {
  margin-top: 30px;
}

.year-heading,
.month-heading {
  font: inherit;
}

.year-toggle {
  display: flex;
  align-items: baseline;
  gap: 12px;
  width: 100%;
  padding: 14px 8px 10px;
  border: 0;
  border-bottom: 1px solid var(--border-divider);
  border-radius: 8px 8px 0 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.2s ease;
}

.year-toggle:hover {
  background: rgba(var(--color-primary-rgb), 0.05);
}

.year-toggle:focus-visible {
  outline: 2px solid var(--color-primary-hover);
  outline-offset: -2px;
}

.year-number {
  color: var(--color-primary-hover);
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 40px;
  font-style: italic;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1;
}

.year-meta {
  color: var(--color-text);
  font-family: var(--font-ui);
  font-size: 12px;
}

.year-chevron {
  display: inline-flex;
  align-self: center;
  margin-left: auto;
  color: var(--color-primary-hover);
  font-size: 19px;
  line-height: 1;
  transition: transform 0.25s var(--ease-standard);
}

.year-chevron.is-open {
  transform: rotate(90deg);
}

.year-content {
  padding-top: 2px;
}

/* ---------- 月份 ---------- */
.month-section {
  margin-top: 12px;
}

.month-section + .month-section {
  margin-top: 20px;
}

.month-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 2px;
  padding: 0 8px;
}

.month-number {
  color: var(--color-primary-hover);
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 21px;
  font-style: italic;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 1;
}

.month-unit {
  color: var(--color-text);
  font-family: var(--font-kai);
  font-size: 13px;
  font-weight: 600;
}

.month-rule {
  flex: 1;
  height: 1px;
  background: var(--border-divider);
  opacity: 0.55;
}

.month-count {
  color: var(--color-text);
  font-family: var(--font-ui);
  font-size: 11px;
  white-space: nowrap;
}

/* ---------- 文章行 ---------- */
.post-list {
  display: flex;
  flex-direction: column;
}

.post-row {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 18px;
  gap: 16px;
  padding: 13px 8px;
  border-bottom: 1px dashed var(--border-divider);
  border-radius: 8px;
  color: inherit;
  text-decoration: none;
  transition: background 0.2s ease;
}

.post-row:last-child {
  border-bottom: 0;
}

.post-row:hover,
.post-row:focus-visible {
  background: rgba(var(--color-primary-rgb), 0.06);
}

.post-row:active {
  background: rgba(var(--color-primary-rgb), 0.1);
}

.post-row:focus-visible {
  outline: 2px solid var(--color-primary-hover);
  outline-offset: -2px;
}

.post-day {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding-top: 1px;
  padding-right: 14px;
  border-right: 1px solid var(--border-divider);
  color: var(--color-heading);
  font-family: Georgia, 'Times New Roman', serif;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.post-day__num {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 19px;
  font-weight: 700;
}

.post-month {
  color: var(--color-text);
  font-family: var(--font-ui);
  font-size: 10px;
  letter-spacing: 0.04em;
}

.post-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.post-title {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: var(--color-heading);
  font-family: var(--font-kai);
  font-size: 17.5px;
  font-weight: 600;
  line-height: 1.45;
  text-wrap: pretty;
  transition: color 0.2s ease;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.post-row:hover .post-title,
.post-row:focus-visible .post-title {
  color: var(--color-primary-hover);
}

.post-summary {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-ui);
  font-size: 13px;
  line-height: 1.7;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
  font-family: var(--font-ui);
}

/* 共享 chip 自己不声明字体（吃全局 reset 的 sans）；这里把它拉回站点 UI 栈 */
.post-meta :deep(.ui-chip) {
  font-family: var(--font-ui);
}

.post-views {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text);
  font-family: var(--font-ui);
  font-size: 11.5px;
}

.post-views__icon {
  font-size: 13px;
}

.post-arrow {
  display: inline-flex;
  align-self: center;
  color: var(--color-primary-hover);
  font-size: 17px;
  line-height: 1;
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.2s ease, transform 0.25s var(--ease-standard);
}

.post-row:hover .post-arrow,
.post-row:focus-visible .post-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* ---------- 响应式 ---------- */
@media (max-width: 768px) {
  .archive-card {
    padding: 22px 18px 20px;
  }

  .archive-kicker {
    font-size: 18px;
  }

  .archive-title {
    font-size: 22px;
  }

  .year-toggle {
    gap: 10px;
    padding: 12px 4px 9px;
  }

  .year-number {
    font-size: 34px;
  }

  .month-heading {
    padding: 0 4px;
  }

  .post-row {
    grid-template-columns: 40px minmax(0, 1fr) 16px;
    gap: 12px;
    padding: 12px 4px;
  }

  .post-day {
    padding-right: 10px;
  }

  .post-day__num {
    font-size: 17px;
  }

  .post-title {
    font-size: 16px;
  }

  .post-summary {
    font-size: 12.5px;
  }

  .post-meta {
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .archive-card {
    padding: 20px 14px 18px;
  }

  .archive-head {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 10px;
  }

  .archive-kicker {
    font-size: 17px;
  }

  .archive-title {
    font-size: 21px;
  }

  .year-toggle {
    gap: 8px;
    padding: 11px 2px 8px;
  }

  .year-number {
    font-size: 30px;
  }

  .year-meta {
    font-size: 11px;
  }

  .year-chevron {
    font-size: 17px;
  }

  .month-heading {
    gap: 6px;
    padding: 0 2px;
  }

  .month-number {
    font-size: 19px;
  }

  .month-unit {
    font-size: 12px;
  }

  .month-count {
    font-size: 10.5px;
  }

  .post-row {
    grid-template-columns: 34px minmax(0, 1fr) 14px;
    gap: 10px;
    padding: 11px 2px;
  }

  .post-day {
    padding-right: 8px;
  }

  .post-day__num {
    font-size: 16px;
  }

  .post-month {
    font-size: 9.5px;
  }

  .post-title {
    font-size: 15.5px;
  }

  .post-summary {
    font-size: 12px;
  }

  .post-views {
    font-size: 11px;
  }

  .post-arrow {
    font-size: 15px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .year-toggle,
  .year-chevron,
  .post-row,
  .post-title,
  .post-arrow {
    transition: none;
  }

  .post-row:hover .post-arrow,
  .post-row:focus-visible .post-arrow {
    transform: none;
  }
}
</style>
