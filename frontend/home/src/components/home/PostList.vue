<template>
  <GlassPanel ref="panelEl" as="section" class="post-list">
    <div class="header">
      <div class="header-copy">
        <span class="header-kicker">{{ headerKicker }}</span>
        <div class="header-main">
          <span class="icon-shell">
            <AppIcon icon="material-symbols:article-outline" class="icon" />
          </span>
          <h3 class="section-title">{{ sectionTitle }}</h3>
        </div>
      </div>
      <div class="header-actions">
        <span class="count" v-if="total !== null">
          <strong>{{ total }}</strong>
          <span>篇文章</span>
        </span>
        <button v-if="hasFilter" class="clear-btn" @click="onClear">
          <AppIcon icon="material-symbols:close" class="clear-icon" />
          <span>清除筛选</span>
        </button>
      </div>
    </div>
    <ContentState v-if="loading" kind="loading" size="compact">
      加载中...
    </ContentState>
    <ContentState
      v-else-if="!posts.length"
      kind="empty"
      size="compact"
      icon="material-symbols:description-outline"
    >
      {{ emptyText }}
    </ContentState>
    <div v-else class="posts-stack">
      <a
        v-for="(post, index) in posts"
        :key="post.id"
        class="post-card"
        :class="index === featuredIndex ? 'post-card--featured' : 'post-card--compact'"
        :href="`/post/${post.id}`"
        @click="markPostSplash(post)"
      >
        <div class="post-cover" :class="{ 'is-empty': !post.cover }">
          <!-- 封面按卡片大小分两档：大图卡（featuredIndex，手机显示 326px / 桌面最高 640px）
               用原图；小图卡（显示 112–182px）用后端已有的 400px 缩略图，2x/3x 屏都够清晰。
               coverThumb 为空时回退原图（外链封面、没有 image 记录的老数据）。
               首图是报告里的 LCP 元素：eager + fetchpriority=high 消除 690ms 发现延迟。 -->
          <img
            v-if="post.cover"
            :src="index === featuredIndex ? post.cover : (post.coverThumb || post.cover)"
            :alt="post.title"
            :loading="index === featuredIndex ? 'eager' : 'lazy'"
            :fetchpriority="index === featuredIndex ? 'high' : undefined"
            decoding="async"
          />
          <AppIcon v-else icon="material-symbols:article-outline" class="cover-empty-icon" />
          <span class="cover-wash"></span>
          <div class="cover-topline">
            <span class="post-index">{{ formatIndex(index) }}</span>
            <span v-if="post.category" class="cover-tag">{{ post.category.name }}</span>
          </div>
          <span v-if="index === featuredIndex" class="featured-label">
            <AppIcon icon="material-symbols:auto-awesome" />
            最近更新
          </span>
          <h4 v-if="index === featuredIndex" class="featured-title">{{ post.title }}</h4>
          <span class="cover-arrow">
            <AppIcon icon="material-symbols:arrow-outward-rounded" />
          </span>
        </div>
          <div class="post-body">
          <div v-if="index === featuredIndex" class="featured-kicker">
            <span>FEATURED NOTE</span>
            <i></i>
          </div>
          <h4 v-else class="title">{{ post.title }}</h4>
          <p v-if="post.summary" class="excerpt">{{ post.summary }}</p>
          <div class="meta">
            <span class="author">
              <AppIcon icon="material-symbols:person-outline" />
              {{ post.author }}
            </span>
            <span class="date">
              <AppIcon icon="material-symbols:schedule-outline" />
              {{ formatDate(post.createdAt) }}
            </span>
            <span class="read-more">
              阅读全文
              <AppIcon icon="material-symbols:arrow-forward-rounded" />
            </span>
          </div>
        </div>
      </a>
    </div>

    <!-- 翻页：只有一页时不渲染。分页状态与取数都留在本组件内，
         不必往 HomeView 传状态（那要凭空多一层 props/emit 管路） -->
    <Pagination
      v-if="totalPages > 1"
      :page="page"
      :totalPages="totalPages"
      @update:page="onPageChange"
    />
  </GlassPanel>
</template>
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { formatDate } from '@/utils/date'
import { getPosts } from '@/api/post'
import { useMessageBox } from '@/composables/useMessageBox'
import { markPostSplash } from '@/utils/postSplash'
import { createSilentSync, listFingerprint } from '@/utils/liveData'
import ContentState from '@/components/common/ContentState.vue'
import GlassPanel from '@/components/common/GlassPanel.vue'
import Pagination from '@/components/common/Pagination.vue'

// 首页每页条数。必须与 index.astro 的 fetchPosts(1, 8) 保持一致，
// 否则构建期烘焙的切片与这里对账的切片不同，指纹永不相等 → 每次访问都无谓重绘
const PAGE_SIZE = 8

const props = defineProps({
  categoryId: {
    type: Number,
    default: null
  },
  searchQuery: {
    type: String,
    default: ''
  },
  // 构建期烘焙的首屏数据（index.astro 注入），页面必定传入（取数失败传空对象）。
  // 不写 default：Astro 对 JS SFC 的函数式 default 会破坏 .vue 的类型生成
  // （报 "has no default export"），故此处无 default 并在下方兜底
  initialData: {
    type: Object
  }
})

const emit = defineEmits(['clear', 'loaded'])

const baked = props.initialData || {}
// 有烘焙数据就直接渲染 → 预渲染 HTML 里就有文章，首屏不闪「加载中」
const posts = ref(baked.posts || [])
const total = ref(baked.total ?? 0)
const loading = ref(!posts.value.length)
// 分页状态。初值全部取自烘焙数据（index.astro 注入的第 1 页），
// SSR 与客户端首帧一致 → 无水合差异，分页控件也能直接印进预渲染 HTML
const page = ref(1)
const totalPages = ref(baked.totalPages ?? 1)
// 翻页后要把列表面板滚回视野（首页顶部是整屏 Hero，不能像日记页那样 scrollTo(0)）
const panelEl = ref(null)
// 请求令牌：挂载首取（无筛选）、翻页、搜索词/分类变化的重取彼此存在竞态，
// 只采纳最后一次请求的结果，防止过期响应覆盖过滤结果
let fetchToken = 0
const { toast } = useMessageBox()

// 大图卡只出现在第 1 页：它身上写着「最近更新 / FEATURED NOTE」，
// 而第 2 页起的第一篇并不是最新文章，照旧渲染这两个标签就是假信息
const featuredIndex = computed(() => (page.value === 1 ? 0 : -1))

// 编号跨页连续（第 2 页是 09–16），而不是每页都从 01 重来
function formatIndex(index) {
  return String((page.value - 1) * PAGE_SIZE + index + 1).padStart(2, '0')
}

const hasFilter = computed(() => props.categoryId !== null || props.searchQuery !== '')

const headerKicker = computed(() => {
  if (props.searchQuery) return 'SEARCH / RESULT'
  if (props.categoryId) return 'CATEGORY / NOTES'
  return 'YULABU / JOURNAL'
})

const sectionTitle = computed(() => {
  if (props.searchQuery) return `搜索结果：${props.searchQuery}`
  if (props.categoryId) return '分类文章'
  return '最新文章'
})

const emptyText = computed(() => {
  if (props.searchQuery) return '没有找到相关文章'
  if (props.categoryId) return '该分类暂无文章'
  return '暂无文章'
})

// 水合后静默对账：构建期烘焙的数据可能已过期（本项目约定发新文章无需重新构建）
const silentSync = createSilentSync({
  baked: listFingerprint(baked.posts, baked.total),
  load: () => getPosts(1, PAGE_SIZE),
  key: (data) => listFingerprint(data.posts, data.total),
  apply: (data) => {
    // 对账期间用户可能已选中标签、发起搜索或翻页，别用「无筛选的第 1 页」覆盖当前视图
    if (hasFilter.value || page.value !== 1) return
    posts.value = data.posts
    total.value = data.total
    // 页数也要更新：新建的文章可能让第 1 页之外多出一页
    totalPages.value = Math.max(1, data.totalPages || 1)
  }
})

async function fetchPosts() {
  const token = ++fetchToken
  // 取数期间页码可能又变（连点翻页），先固化本次要取的页
  const target = page.value
  // 仅在没有任何内容可展示时才进入加载态：翻页/切换标签/搜索时保留旧列表，
  // 避免整块闪成「加载中」再闪回来
  if (!posts.value.length) loading.value = true
  try {
    const data = await getPosts(target, PAGE_SIZE, props.categoryId, props.searchQuery || undefined)
    if (token !== fetchToken) return
    const lastPage = Math.max(1, data.totalPages || 1)
    if (target > lastPage) {
      // 期间文章被删/筛选收窄，目标页已不存在：退回最后一页（watch(page) 会重新取数）
      page.value = lastPage
      return
    }
    posts.value = data.posts
    total.value = data.total
    totalPages.value = lastPage
  } catch (e) {
    if (token !== fetchToken) return
    toast('获取文章列表失败', 'error')
  } finally {
    if (token === fetchToken) {
      loading.value = false
      emit('loaded')
    }
  }
}

function onPageChange(next) {
  page.value = next
  scrollToList()
}

function scrollToList() {
  // GlassPanel 是组件，取它的根元素
  const el = panelEl.value?.$el ?? panelEl.value
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onClear() {
  emit('clear')
}

onMounted(() => {
  if (posts.value.length) {
    // 首屏已是真实内容：立即放行加载遮罩，且只在未筛选时对账
    // （筛选态交给 watch 正常拉取）
    emit('loaded')
    if (!hasFilter.value) silentSync()
  } else {
    fetchPosts()
  }
})

watch(page, fetchPosts)

// 标签/搜索变化一律回第 1 页（第 3 页筛出 2 篇还停在第 3 页就是空列表）。
// 页码本身就变了的情况交给 watch(page) 取数，避免重复发一次请求
watch(() => [props.categoryId, props.searchQuery], () => {
  if (page.value !== 1) page.value = 1
  else fetchPosts()
}, { deep: true })
</script>
<style scoped>
.post-list {
  width: 100%;
  padding: 26px 22px 24px;
  border: 1px solid var(--border-light);
  border-radius: 24px;
  box-shadow: 0 12px 32px var(--shadow-color);
  background: linear-gradient(145deg, var(--bg-card-strong), var(--bg-card));
  backdrop-filter: blur(18px);
  display: flex;
  flex-direction: column;
  gap: 18px;
  /* 翻页后滚动到本面板：让开 56px 固定 Navbar（与全站 top:96px 的约定同值） */
  scroll-margin-top: 96px;
}

/* 面板自身有 18px gap，分页再自带 16px 上内边距会显得松 */
.post-list :deep(.pagination) {
  padding-top: 2px;
}

.header {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border-divider);
}

.header::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 72px;
  height: 2px;
  border-radius: 2px;
  background: var(--color-primary);
}

.header-copy {
  min-width: 0;
}

.header-kicker {
  display: block;
  margin-bottom: 7px;
  color: var(--color-muted);
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .18em;
  line-height: 1;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-shell {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(var(--color-primary-rgb), .16);
  border-radius: 12px;
  background: rgba(var(--color-primary-rgb), .1);
  box-shadow: inset 0 1px 0 var(--border-light);
}

.icon {
  color: var(--color-primary);
  font-size: 21px;
}

.section-title {
  min-width: 0;
  overflow: hidden;
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-weight: 700;
  color: var(--color-heading);
  font-size: 21px;
  line-height: 1.25;
  letter-spacing: .06em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  gap: 8px;
}

.count {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 7px 11px;
  border: 1px solid rgba(var(--color-accent-rgb), .18);
  border-radius: 12px;
  background: rgba(var(--color-accent-rgb), .09);
  color: var(--color-text);
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 11px;
  white-space: nowrap;
}

.count strong {
  color: var(--color-heading);
  font-size: 17px;
  line-height: 1;
}

.clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid rgba(var(--color-primary-rgb), .14);
  border-radius: 12px;
  background: rgba(var(--color-primary-rgb), .08);
  color: var(--color-text);
  font-size: 11px;
  padding: 8px 10px;
  cursor: pointer;
  transition: background .2s ease, color .2s ease, border-color .2s ease;
}

.clear-btn:hover {
  border-color: rgba(var(--color-primary-rgb), .28);
  background: rgba(var(--color-primary-rgb), .17);
  color: var(--color-heading);
}

.clear-icon {
  font-size: 14px;
}

.posts-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.post-card {
  position: relative;
  display: block;
  overflow: hidden;
  border: 1px solid rgba(var(--color-accent-rgb), .2);
  border-radius: 18px;
  background: linear-gradient(145deg,
      var(--bg-glass-start),
      var(--bg-glass-mid) 58%,
      var(--bg-glass-end));
  box-shadow: 0 6px 16px rgba(0, 0, 0, .06);
  backdrop-filter: blur(14px);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease;
}

.post-card:hover {
  border-color: rgba(var(--color-primary-rgb), .4);
  box-shadow: 0 12px 26px var(--shadow-color);
  transform: translateY(-3px);
}

.post-cover {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1.9 / 1;
  overflow: hidden;
  background: linear-gradient(135deg,
      rgba(var(--color-primary-rgb), .17),
      rgba(var(--color-accent-rgb), .13));
}

.post-cover img {
  z-index: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform .6s cubic-bezier(.2, .7, .2, 1), filter .3s ease;
}

.post-card:hover .post-cover img {
  filter: saturate(1.08);
  transform: scale(1.045);
}

.cover-wash {
  position: absolute;
  z-index: 1;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(10, 30, 22, .04) 20%, rgba(8, 27, 20, .8) 100%);
}

.post-cover.is-empty::before,
.post-cover.is-empty::after {
  content: '';
  position: absolute;
  z-index: 2;
  pointer-events: none;
  border: 1px solid rgba(var(--color-primary-rgb), .24);
}

.post-cover.is-empty::before {
  width: 66%;
  aspect-ratio: 1;
  border-radius: 50%;
  transform: translate(28%, -18%) rotate(18deg);
}

.post-cover.is-empty::after {
  width: 42%;
  height: 62%;
  left: 10%;
  bottom: -22%;
  border-radius: 28px;
  transform: rotate(32deg);
}

.post-cover.is-empty .cover-wash {
  background: linear-gradient(135deg,
      rgba(var(--color-primary-rgb), .2),
      rgba(var(--color-accent-rgb), .2) 55%,
      rgba(var(--color-heading-rgb, 45, 90, 65), .3));
}

.cover-empty-icon {
  position: relative;
  z-index: 3;
  color: rgba(var(--color-primary-rgb), .48);
  font-size: 54px;
  filter: drop-shadow(0 2px 8px rgba(255, 255, 255, .2));
}

.cover-topline {
  position: absolute;
  z-index: 4;
  top: 14px;
  right: 14px;
  left: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.post-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 23px;
  padding: 0 7px;
  border: 1px solid rgba(255, 255, 255, .35);
  border-radius: 8px;
  background: rgba(12, 42, 29, .26);
  color: rgba(255, 255, 255, .9);
  font-family: Georgia, serif;
  font-size: 11px;
  letter-spacing: .08em;
  backdrop-filter: blur(8px);
}

.cover-tag {
  max-width: 60%;
  overflow: hidden;
  padding: 5px 10px;
  border: 1px solid rgba(255, 255, 255, .36);
  border-radius: 9px;
  background: rgba(12, 42, 29, .4);
  color: rgba(255, 255, 255, .94);
  font-size: 11px;
  letter-spacing: .08em;
  text-overflow: ellipsis;
  white-space: nowrap;
  backdrop-filter: blur(8px);
}

.featured-label {
  position: absolute;
  z-index: 4;
  bottom: 70px;
  left: 20px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: rgba(255, 255, 255, .84);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .16em;
}

.featured-label :deep(svg) {
  font-size: 14px;
}

.featured-title {
  position: absolute;
  z-index: 4;
  right: 62px;
  bottom: 17px;
  left: 20px;
  margin: 0;
  overflow: hidden;
  color: #fff;
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: clamp(20px, 3vw, 27px);
  font-weight: 600;
  line-height: 1.3;
  text-overflow: ellipsis;
  text-shadow: 0 2px 12px rgba(0, 0, 0, .26);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.cover-arrow {
  position: absolute;
  z-index: 5;
  right: 18px;
  bottom: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, .42);
  border-radius: 50%;
  background: rgba(12, 42, 29, .34);
  color: #fff;
  backdrop-filter: blur(8px);
  transition: background .25s ease, transform .25s ease;
}

.cover-arrow :deep(svg) {
  font-size: 18px;
}

.post-card:hover .cover-arrow {
  background: var(--color-primary);
  transform: translate(2px, -2px);
}

.post-body {
  min-width: 0;
  padding: 13px 18px 16px;
}

.featured-kicker {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 6px;
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .16em;
}

.featured-kicker i {
  display: block;
  width: 36px;
  height: 1px;
  background: var(--border-divider);
}

.title {
  margin: 0 0 7px;
  overflow: hidden;
  color: var(--color-heading);
  font-family: 'LXGW WenKai', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.45;
  text-overflow: ellipsis;
  transition: color .2s ease;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.post-card:hover .title {
  color: var(--color-primary-hover);
}

.excerpt {
  margin: 0 0 13px;
  overflow: hidden;
  color: var(--color-text);
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 13px;
  line-height: 1.65;
  text-overflow: ellipsis;
  opacity: .82;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.meta {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  color: var(--color-text);
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 11px;
  opacity: .72;
}

.author,
.date,
.read-more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.author,
.date {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta :deep(svg) {
  flex: 0 0 auto;
  font-size: 14px;
}

.read-more {
  margin-left: auto;
  color: var(--color-primary);
  font-weight: 700;
  opacity: 0;
  transform: translateX(-5px);
  transition: opacity .2s ease, transform .2s ease;
}

.read-more :deep(svg) {
  font-size: 15px;
  transition: transform .2s ease;
}

.post-card:hover .read-more {
  opacity: 1;
  transform: translateX(0);
}

.post-card:hover .read-more :deep(svg) {
  transform: translateX(2px);
}

.post-card--compact {
  display: grid;
  grid-template-columns: 182px minmax(0, 1fr);
}

.post-card--compact .post-cover {
  height: 100%;
  min-height: 148px;
  aspect-ratio: auto;
  border-right: 1px solid rgba(var(--color-accent-rgb), .16);
}

.post-card--compact .cover-wash {
  background: linear-gradient(90deg, rgba(8, 27, 20, .02), rgba(8, 27, 20, .56));
}

.post-card--compact .cover-empty-icon {
  font-size: 40px;
}

.post-card--compact .cover-topline {
  top: 12px;
  right: 12px;
  left: 12px;
}

.post-card--compact .cover-tag {
  max-width: 72%;
  padding: 4px 8px;
  font-size: 10px;
}

.post-card--compact .post-body {
  display: flex;
  min-height: 148px;
  flex-direction: column;
  justify-content: center;
  padding: 16px 18px;
}

.post-card--compact .meta {
  margin-top: auto;
}

@media (max-width: 768px) {
  .post-list {
    padding: 22px 18px 20px;
    border-radius: 20px;
  }

  .post-card--compact {
    grid-template-columns: 148px minmax(0, 1fr);
  }

  .post-card--compact .post-cover,
  .post-card--compact .post-body {
    min-height: 136px;
  }

  .post-card--compact .post-body {
    padding: 14px 16px;
  }
}

@media (max-width: 480px) {
  .post-list {
    padding: 20px 14px 18px;
    gap: 15px;
    border-radius: 18px;
  }

  .header {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .section-title {
    font-size: 19px;
  }

  .post-card--featured .post-cover {
    min-height: 190px;
    aspect-ratio: 1.5 / 1;
  }

  .featured-title {
    right: 56px;
    bottom: 15px;
    left: 16px;
    font-size: 21px;
  }

  .featured-label {
    bottom: 62px;
    left: 16px;
  }

  .cover-arrow {
    right: 14px;
    bottom: 14px;
    width: 32px;
    height: 32px;
  }

  .post-card--compact {
    grid-template-columns: 112px minmax(0, 1fr);
  }

  .post-card--compact .post-cover,
  .post-card--compact .post-body {
    min-height: 122px;
  }

  .post-card--compact .post-body {
    padding: 12px 13px;
  }

  .post-card--compact .post-index {
    min-width: 25px;
    height: 20px;
    padding: 0 5px;
    font-size: 10px;
  }

  .post-card--compact .cover-topline {
    top: 9px;
    right: 9px;
    left: 9px;
  }

  .post-card--compact .cover-tag {
    display: none;
  }

  .post-card--compact .cover-empty-icon {
    font-size: 32px;
  }

  .post-card--compact .title {
    margin-bottom: 5px;
    font-size: 15px;
  }

  .post-card--compact .excerpt {
    margin-bottom: 8px;
    font-size: 12px;
    -webkit-line-clamp: 1;
  }

  .meta {
    gap: 8px;
    font-size: 10px;
  }

  .read-more {
    display: none;
  }

}
</style>
