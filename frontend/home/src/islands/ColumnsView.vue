<template>
  <main class="cd-page">
    <header class="cd-page__header">
      <AppIcon icon="material-symbols:album" class="cd-page__icon" />
      <h1 class="cd-page__title">专栏</h1>
      <span class="cd-page__rule" aria-hidden="true"></span>
      <p class="cd-page__subtitle">记录一些想法、学习和生活的碎片</p>
      <span class="cd-page__en" aria-hidden="true">My Columns</span>
    </header>

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

    <!-- CD 收藏架：4 列（<md 768px 2 列），行尾 ghost 补位格把架板拼成整条 -->
    <div v-else class="cd-shelf">
      <CdCase v-for="column in columns" :key="column.id" :column="column" />
      <CdCase v-for="n in ghostCount" :key="`ghost-${n}`" ghost />
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getColumns } from '@/api/column'
import { createSilentSync } from '@/utils/liveData'
import AppIcon from '@/components/ui/AppIcon.vue'
import ContentState from '@/components/ui/ContentState.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import CdCase from '@/components/columns/CdCase.vue'

const props = defineProps({
  // 构建期烘焙的专栏列表（columns/index.astro 注入），页面必定传入（取数失败传空数组）。
  // 不写 default：Astro 对 JS SFC 的函数式 default 会破坏 .vue 的类型生成
  initialColumns: { type: Array }
})

// 有烘焙数据就直接渲染 → 预渲染 HTML 里就有整面收藏架，首屏不闪「加载中」
const columns = ref(props.initialColumns || [])
const loading = ref(!columns.value.length)
const error = ref('')

// post_count 随发文变化，指纹必须带上，否则新文章不会反映到铭牌数量上
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

// 行尾补位格数：总数补到 4 的倍数（同时必然是 2 的倍数，窄屏两列同样成行），
// 让每一条架板都完整收边，像真实的展示架而不是断在半截
const ghostCount = computed(() => {
  const n = columns.value.length
  return n ? (4 - (n % 4)) % 4 : 0
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
.cd-page {
  width: 100%;
  padding: 6px 0 28px;
}

/* ---- 页头：光碟徽标 + 标题 + 破折号 + 副标题，右侧 Cormorant 花体 ---- */
.cd-page__header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 4px 2px 30px;
}

.cd-page__icon {
  align-self: center;
  width: 27px;
  height: 27px;
  color: var(--color-primary);
  opacity: 0.9;
}

.cd-page__title {
  margin: 0;
  font-family: var(--font-kai);
  font-size: 23px;
  font-weight: 700;
  color: var(--color-heading);
  letter-spacing: 0.06em;
}

.cd-page__rule {
  align-self: center;
  width: 30px;
  height: 1px;
  background: var(--border-divider);
}

.cd-page__subtitle {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--color-muted);
}

.cd-page__en {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 600;
  font-size: 21px;
  color: var(--color-primary);
  opacity: 0.9;
  white-space: nowrap;
}

.cd-page__en::before,
.cd-page__en::after {
  content: '';
  width: 26px;
  height: 1px;
}

.cd-page__en::before {
  background: linear-gradient(to right, transparent, var(--border-divider));
}

.cd-page__en::after {
  background: linear-gradient(to left, transparent, var(--border-divider));
}

/* ---- 收藏架：格子间不留缝，铭牌板条靠相邻格子拼接成整条；
     row-gap 是上下两层架之间的墙面呼吸空隙 ---- */
.cd-shelf {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  row-gap: 46px;
}

@media (max-width: 768px) {
  .cd-shelf {
    grid-template-columns: repeat(2, 1fr);
    row-gap: 36px;
  }

  .cd-page__header {
    flex-wrap: wrap;
    row-gap: 4px;
    margin-bottom: 22px;
  }

  .cd-page__en {
    display: none;
  }
}
</style>
