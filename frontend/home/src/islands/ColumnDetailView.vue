<template>
  <main class="column-detail">
    <Skeleton v-if="loading" variant="card" :count="2" />

    <ContentState
      v-else-if="error"
      kind="error"
      size="page"
      retry-text="重新加载"
      @retry="loadDetail"
    >
      {{ error }}
    </ContentState>

    <ContentState v-else-if="!column" kind="empty" size="page">专栏不存在</ContentState>

    <template v-else>
      <!-- 顶部导航：右对齐的花体返回链（Cormorant 由 columns/[id].astro 页面级引入） -->
      <nav class="cd-topbar">
        <a class="cd-back" href="/columns">
          <span class="cd-back__arrow" aria-hidden="true">←</span>
          <span class="cd-back__text">Back to Columns</span>
          <AppIcon class="cd-back__leaf" icon="material-symbols:eco" />
        </a>
      </nav>

      <!-- CD Hero：从收藏架取出的那张 CD，同一份 CdCase 几何整体放大后陈列在玻璃面上 -->
      <GlassPanel class="cd-hero">
        <div class="cd-hero__disc">
          <CdCase :column="column" hero />
        </div>
        <div class="cd-hero__info">
          <h1 class="cd-hero__name">{{ column.name }}</h1>
          <p v-if="column.desc" class="cd-hero__desc">{{ column.desc }}</p>
          <p class="cd-hero__meta">
            <AppIcon class="cd-hero__meta-leaf" icon="material-symbols:eco" />
            <span>共 {{ column.posts.length }} 篇文章</span>
            <template v-if="column.updated_at">
              <span aria-hidden="true">·</span>
              <span>{{ formatDate(column.updated_at) }} 更新</span>
            </template>
          </p>
        </div>
      </GlassPanel>

      <!-- Track List：专栏文章即这张专辑的曲目 -->
      <GlassPanel class="cd-tracks">
        <header class="cd-tracks__head">
          <span class="cd-tracks__label">Track List</span>
        </header>

        <ContentState v-if="column.posts.length === 0" kind="empty" size="panel">
          这张 CD 还没有收录曲目
        </ContentState>

        <ol v-else class="cd-tracks__list">
          <li v-for="(post, index) in column.posts" :key="post.id" class="track">
            <a class="track__link" :href="`/post/${post.id}`" @click="markPostSplash(post)">
              <span class="track__num" aria-hidden="true">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
              <span class="track__body">
                <span class="track__title">{{ post.title }}</span>
                <span class="track__summary card-text">{{ post.summary || '暂无摘要' }}</span>
                <span class="track__meta">
                  <CategoryChip v-if="post.category" size="sm">{{ post.category.name }}</CategoryChip>
                  <span class="track__date">{{ formatDate(post.createdAt) }}</span>
                </span>
              </span>
              <AppIcon class="track__arrow" icon="material-symbols:arrow-forward-rounded" />
            </a>
          </li>
        </ol>
      </GlassPanel>
    </template>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getColumnDetail } from '@/api/column'
import { formatDate } from '@/utils/date'
import { markPostSplash } from '@/utils/postSplash'
import AppIcon from '@/components/ui/AppIcon.vue'
import CategoryChip from '@/components/ui/CategoryChip.vue'
import ContentState from '@/components/ui/ContentState.vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import CdCase from '@/components/columns/CdCase.vue'

// SSR 页（columns/[id].astro）会注入整份专栏数据；prop 缺席时退回客户端拉取
const props = defineProps({
  initialColumn: {
    type: Object,
    default: null
  },
  // 专栏 id 由页面注入（改前在客户端用 window.location.pathname 反解，
  // 属于「服务端拿不到的客户端状态」；现在两处都从同一份 props 来）
  columnId: {
    type: Number,
    default: 0
  }
})

const column = ref(props.initialColumn)
const loading = ref(!props.initialColumn)
const error = ref('')

async function loadDetail() {
  if (!props.columnId) return
  loading.value = true
  error.value = ''
  try {
    column.value = await getColumnDetail(props.columnId)
  } catch (e) {
    error.value = '专栏加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!props.initialColumn) loadDetail()
})
</script>

<style scoped>
/* PageFrame withRail 模式下容器宽度与内边距由骨架提供，这里只做纵向排列 */
.column-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

/* ---- 顶部返回链 ---- */
.cd-topbar {
  display: flex;
  justify-content: flex-end;
}

.cd-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--color-primary);
  transition:
    color 0.5s var(--ease-standard),
    transform 0.5s var(--ease-standard);
}

.cd-back:hover {
  color: var(--color-primary-hover);
  transform: translateX(-3px);
}

.cd-back__arrow {
  font-size: 15px;
  line-height: 1;
}

.cd-back__text {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 600;
  font-size: 18px;
  letter-spacing: 0.02em;
}

.cd-back__leaf {
  font-size: 14px;
  opacity: 0.75;
}

/* ---- CD Hero ---- */
.cd-hero {
  display: flex;
  align-items: center;
  gap: 44px;
  padding: 34px 40px;
  border-radius: 16px;
}

/* CdCase 几何全以格子宽的百分比派生：容器给多大，盒与碟就等比放大多大
   （340px 容器 → 塑料盒约 238px / 碟约 226px，收藏架约 166px） */
.cd-hero__disc {
  width: 340px;
  flex-shrink: 0;
}

.cd-hero__info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cd-hero__name {
  margin: 0;
  font-family: var(--font-kai);
  font-size: 30px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--color-heading);
}

.cd-hero__desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.8;
}

.cd-hero__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-muted);
}

.cd-hero__meta-leaf {
  font-size: 15px;
  color: var(--color-primary);
  opacity: 0.8;
}

/* ---- Track List ---- */
.cd-tracks {
  padding: 26px 34px 16px;
  border-radius: 16px;
}

.cd-tracks__head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 6px;
}

.cd-tracks__label {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 600;
  font-size: 21px;
  line-height: 1;
  color: var(--color-primary);
}

.cd-tracks__head::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, var(--border-divider), transparent);
}

.cd-tracks__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 曲目之间的细腻分割线：hover 时上下两道一起微微提亮 */
.track + .track {
  border-top: 1px solid var(--border-divider);
  transition: border-color 0.5s var(--ease-standard);
}

.track:hover {
  border-top-color: rgba(var(--color-primary-rgb), 0.35);
}

.track:hover + .track {
  border-top-color: rgba(var(--color-primary-rgb), 0.35);
}

.track__link {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 20px;
  padding: 22px 10px;
  border-radius: 12px;
  text-decoration: none;
  transition:
    background-color 0.5s var(--ease-standard),
    transform 0.5s var(--ease-standard),
    box-shadow 0.5s var(--ease-standard);
}

.track__link:hover {
  background-color: rgba(var(--color-primary-rgb), 0.06);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px -8px var(--shadow-color);
}

.track__num {
  min-width: 46px;
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 600;
  font-size: 30px;
  line-height: 1;
  color: var(--color-primary);
  opacity: 0.85;
  transition: opacity 0.5s var(--ease-standard);
}

.track__link:hover .track__num {
  opacity: 1;
}

.track__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.track__title {
  font-family: var(--font-kai);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.5;
  color: var(--color-heading);
}

/* 摘要排版（两行截断/配色）走共享的 .card-text */

.track__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 2px;
}

.track__date {
  font-size: 12px;
  color: var(--color-muted);
}

.track__arrow {
  font-size: 20px;
  color: var(--color-muted);
  opacity: 0.7;
  transition:
    transform 0.5s var(--ease-standard),
    color 0.5s var(--ease-standard),
    opacity 0.5s var(--ease-standard);
}

.track__link:hover .track__arrow {
  transform: translateX(4px);
  color: var(--color-primary);
  opacity: 1;
}

/* ---- 响应式（只用全站三档断点） ----
   ≤1024px：左栏已由 PageFrame 隐藏，主列变宽，CD 稍收一档保住信息列宽度 */
@media (max-width: 1024px) {
  .cd-hero {
    gap: 32px;
  }

  .cd-hero__disc {
    width: 300px;
  }
}

@media (max-width: 768px) {
  .cd-hero {
    flex-direction: column;
    align-items: center;
    gap: 26px;
    padding: 26px 22px;
  }

  /* 移动端单列：CD 居中陈列，比例完整 */
  .cd-hero__disc {
    width: min(72vw, 300px);
  }

  .cd-hero__info {
    width: 100%;
  }

  .cd-hero__name {
    font-size: 24px;
  }

  .cd-tracks {
    padding: 20px 18px 10px;
  }

  .track__link {
    gap: 14px;
    padding: 18px 6px;
  }

  .track__num {
    min-width: 34px;
    font-size: 24px;
  }

  .track__title {
    font-size: 16px;
  }
}
</style>
