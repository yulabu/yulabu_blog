<template>
  <div class="page-container page-container--narrow column-detail-layout">
    <Skeleton v-if="loading" variant="card" :count="1" />

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
      <GlassPanel class="column-header">
        <img v-if="column.cover" :src="column.cover" :alt="column.name" class="header-cover" />
        <CoverFallback v-else variant="tinted" class="header-cover" :text="column.name.charAt(0)" />
        <div class="header-info">
          <h1 class="header-name">{{ column.name }}</h1>
          <p v-if="column.desc" class="header-desc">{{ column.desc }}</p>
          <span class="header-count">共 {{ column.posts.length }} 篇文章</span>
        </div>
      </GlassPanel>

      <GlassPanel class="posts-card">
        <ContentState v-if="column.posts.length === 0" kind="empty" size="panel">
          专栏内暂无文章
        </ContentState>
        <div
          v-else
          v-for="(post, index) in column.posts"
          :key="post.id"
          class="post-item"
        >
          <a class="post-item-link" :href="`/post/${post.id}`" @click="markPostSplash(post)">
            <span class="post-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div class="post-info">
              <h3 class="post-title">{{ post.title }}</h3>
              <p class="post-summary card-text">{{ post.summary || '暂无摘要' }}</p>
              <div class="post-meta">
                <CategoryChip v-if="post.category" size="sm">{{ post.category.name }}</CategoryChip>
                <span class="post-date">{{ formatDate(post.createdAt) }}</span>
              </div>
            </div>
          </a>
        </div>
      </GlassPanel>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getColumnDetail } from '@/api/column'
import { formatDate } from '@/utils/date'
import { markPostSplash } from '@/utils/postSplash'
import CategoryChip from '@/components/ui/CategoryChip.vue'
import ContentState from '@/components/ui/ContentState.vue'
import CoverFallback from '@/components/ui/CoverFallback.vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

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
/* 容器（.page-container--narrow）与共用排版在 styles/components.css */
.column-detail-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.column-header {
  display: flex;
  gap: 20px;
  padding: 24px;
  border-radius: 16px;
}

.header-cover {
  width: 160px;
  height: 100px;
  object-fit: cover;
  border-radius: 12px;
  flex-shrink: 0;
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

.post-item-link {
  display: flex;
  gap: 16px;
  width: 100%;
  min-width: 0;
  text-decoration: none;
  color: inherit;
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

/* 排版在 .card-text；行距比卡片多 8px，保留在本组件 */
.post-summary {
  margin-bottom: 8px;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 10px;
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
