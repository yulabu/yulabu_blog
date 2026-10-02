<template>
  <main class="page-container page-container--wide">
    <Skeleton v-if="loading" variant="card" :count="3" />

    <ContentState
      v-else-if="error"
      kind="error"
      size="page"
      retry-text="重新加载"
      @retry="loadFirstPaint"
    >
      {{ error }}
    </ContentState>

    <ContentState v-else-if="columns.length === 0" kind="empty" size="page">
      暂无专栏
    </ContentState>

    <div v-else class="card-grid">
      <GlassPanel
        as="a"
        v-for="column in columns"
        :key="column.id"
        class="column-card"
        :href="`/columns/${column.id}`"
      >
        <div class="card-cover">
          <img
            v-if="column.cover"
            :src="column.cover"
            :alt="column.name"
            class="cover-img"
            loading="lazy"
          />
          <CoverFallback v-else :text="column.name.charAt(0)" />
          <span class="cover-count">{{ column.post_count }} 篇</span>
        </div>

        <div class="card-body card-info">
          <h3 class="card-title">{{ column.name }}</h3>
          <p class="card-text">{{ column.desc || '这个专栏还没有简介' }}</p>
        </div>
      </GlassPanel>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getColumns } from '@/api/column'
import { createSilentSync } from '@/utils/liveData'
import ContentState from '@/components/ui/ContentState.vue'
import CoverFallback from '@/components/ui/CoverFallback.vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const props = defineProps({
  // 构建期烘焙的专栏列表（columns/index.astro 注入），页面必定传入（取数失败传空数组）。
  // 不写 default：Astro 对 JS SFC 的函数式 default 会破坏 .vue 的类型生成
  initialColumns: { type: Array }
})

// 有烘焙数据就直接渲染 → 预渲染 HTML 里就有内容，首屏不闪「加载中」
const columns = ref(props.initialColumns || [])
const loading = ref(!columns.value.length)
const error = ref('')

// post_count 随发文变化，指纹必须带上，否则新文章不会反映到专栏卡片上
function fingerprintOf(list) {
  return (list ?? []).map((c) => `${c.id}:${c.post_count}`).join(',')
}

const silentSync = createSilentSync({
  baked: fingerprintOf(props.initialColumns),
  load: () => getColumns(),
  key: fingerprintOf,
  apply: (list) => {
    columns.value = list
  }
})

// 客户端兜底取数（烘焙数据缺席时）：失败落在页面上的失败态里，可重试
async function loadFirstPaint() {
  loading.value = true
  error.value = ''
  try {
    columns.value = await getColumns()
  } catch (e) {
    error.value = '专栏加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (props.initialColumns.length) silentSync()
  else loadFirstPaint()
})
</script>

<style scoped>
/* 容器/网格/卡片排版都在 styles/components.css（跨页共用）；这里只留专栏卡自己的部分 */
.column-card {
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  text-decoration: none;
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

/* 与友链卡的区别：正文区更高一点（卡里有 16/9 封面） */
.card-info {
  padding: 14px 16px 18px;
  /* 卡片正文沿用雅黑栈（改名前后一致：原 .card-name/.card-desc 各自声明过） */
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}
</style>
