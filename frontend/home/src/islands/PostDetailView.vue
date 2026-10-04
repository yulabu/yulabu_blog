<template>
  <div class="detail-container">
    <main class="main-content">
      <GlassPanel class="meta-card">
        <h1 class="post-title">{{ post.title }}</h1>
        <div class="meta-row">
          <CategoryChip v-if="post.category" variant="solid">{{ post.category.name }}</CategoryChip>
          <span class="meta-separator">·</span>
          <span class="author">{{ post.author }}</span>
          <span class="meta-separator">·</span>
          <span class="date">{{ formatDate(post.createdAt) }}</span>
          <span class="meta-separator">·</span>
          <span class="views">
            <AppIcon icon="material-symbols:visibility-outline" class="view-icon" />
            {{ formatViewCount(post.viewCount) }} 次阅读
          </span>
          <button type="button" class="share-btn" aria-label="分享文章" @click="shareVisible = true">
            <AppIcon icon="material-symbols:ios-share" />
          </button>
        </div>
      </GlassPanel>
      <nav v-if="prevPost || nextPost" class="chapter-nav">
        <GlassPanel
          v-if="prevPost"
          as="a"
          class="chapter-item prev"
          :href="`/post/${prevPost.id}`"
          @click="markPostSplash(prevPost)"
        >
          <span class="chapter-label">上一篇</span>
          <span class="chapter-title">{{ prevPost.title }}</span>
        </GlassPanel>
        <GlassPanel v-else class="chapter-item disabled">
          <span class="chapter-label">上一篇</span>
          <span class="chapter-title">已是第一篇</span>
        </GlassPanel>
        <GlassPanel
          v-if="nextPost"
          as="a"
          class="chapter-item next"
          :href="`/post/${nextPost.id}`"
          @click="markPostSplash(nextPost)"
        >
          <span class="chapter-label">下一篇</span>
          <span class="chapter-title">{{ nextPost.title }}</span>
        </GlassPanel>
        <GlassPanel v-else class="chapter-item disabled">
          <span class="chapter-label">下一篇</span>
          <span class="chapter-title">已是最后一篇</span>
        </GlassPanel>
      </nav>
      <GlassPanel class="content-card">
        <MdPreview
          :modelValue="post.content"
          :theme="mdTheme"
          previewTheme="github"
          :codeTheme="mdCodeTheme"
          :showCodeRowNumber="true"
          no-katex
          no-mermaid
          no-echarts
          :mdHeadingId="(h) => `heading-${h.index}`"
          @onGetCatalog="handleCatalog"
        />
      </GlassPanel>
      <!-- 文末分享条：与 meta-row 小按钮共用同一弹层，显眼入口放在文章读完的位置 -->
      <aside class="share-banner">
        <span class="share-banner__icon">
          <AppIcon icon="material-symbols:share" />
        </span>
        <div class="share-banner__text">
          <p class="share-banner__title">分享</p>
          <p class="share-banner__desc">如果这篇文章对你有帮助，欢迎分享给更多人！</p>
        </div>
        <button type="button" class="share-banner__btn" @click="shareVisible = true">分享</button>
      </aside>
      <GiscusComments v-if="commentsEnabled" />
      <!-- 分享弹层懒加载（defineAsyncComponent）：组件与海报绘制代码、qrcode 包都只在
           点击后下载，文章页首屏 JS 零增重 -->
      <SharePanel
        v-if="shareVisible"
        :post-id="postId"
        :post-title="post.title"
        :summary="post.summary || ''"
        :cover="post.cover || ''"
        :author="post.author"
        :created-at="post.createdAt"
        :site-origin="siteOrigin"
        @close="shareVisible = false"
      />
    </main>
    <aside class="toc-sidebar">
      <GlassPanel class="toc-card">
        <SectionHeader>目录</SectionHeader>
        <ul v-if="catalog.length" class="toc-list">
          <li
            v-for="item in catalog"
            :key="item.id"
            :class="['toc-item', `level-${item.level}`, { active: activeHeading === item.id }]"
            @click="scrollToHeading(item.id)"
          >
            {{ item.text }}
          </li>
        </ul>
        <div v-else class="toc-empty">暂无目录</div>
      </GlassPanel>
    </aside>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
// 必须先于 md-editor-v3 求值：config() 要在这里注入本地 highlight.js 与本地
// 主题 css（根除 unpkg.com 运行时外链）。放在本组件而非 _app.ts，是为了不让
// highlight.js 进到每个页面都要加载的全局包（详见 _app.ts 注释）。
import { applyHljsCss } from '@/utils/mdEditorSetup'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { formatDate } from '@/utils/date'
import { formatViewCount } from '@/utils/format'
import { getPost, getPrevPost, getNextPost, recordPostView } from '@/api/post'
import { useToast } from '@/stores/toast'
import { useUiStore } from '@/stores/ui'
import { markPostSplash } from '@/utils/postSplash'
import CategoryChip from '@/components/ui/CategoryChip.vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import GiscusComments from '@/components/post/GiscusComments.vue'

// 点分享才加载的弹层（模板里 v-if 守着，点击前不拉 chunk）
const SharePanel = defineAsyncComponent(() => import('@/components/post/SharePanel.vue'))

// SSR 页（post/[id].astro）服务端取好文章与上下篇，经 props 注入首屏；
// MPA 整页跳转下不需要 watch 路由，prop 缺席时才退回客户端拉取
const props = defineProps({
  postId: {
    type: Number,
    required: true
  },
  initialPost: {
    type: Object,
    default: null
  },
  initialPrev: {
    type: Object,
    default: null
  },
  initialNext: {
    type: Object,
    default: null
  },
  // 后台「系统设置」的评论区总开关，由 post/[id].astro SSR 取数后注入；缺省视为开启
  commentsEnabled: {
    type: Boolean,
    default: true
  },
  // 站点对外规范源（canonical origin，与 og:url 同源）：post/[id].astro 必传，不设默认值
  siteOrigin: {
    type: String,
    required: true
  }
})

const { toast } = useToast()
const uiStore = useUiStore()
const shareVisible = ref(false)

const post = ref(props.initialPost || {
  title: '',
  content: '',
  category: null,
  author: '',
  viewCount: 0,
  createdAt: ''
})
const catalog = ref([])
const activeHeading = ref('')
// 页面传进来的空值约定是 {} 而不是 null（Astro 对 JS SFC 的 props 推断不接受 null），
// 所以按「有没有 id」判空：空对象一律折成 null，模板里 v-if="prevPost" 的语义不变
const prevPost = ref(props.initialPrev?.id ? props.initialPrev : null)
const nextPost = ref(props.initialNext?.id ? props.initialNext : null)

// 水合稳态：SSR 与客户端首帧一致用 light 主题，挂载后同步真实主题
// （暗色用户的代码高亮配色在水合后切换，避免 md-editor 根级水合 mismatch）
const mdTheme = ref('light')
const mdCodeTheme = ref('github')

function syncMdTheme() {
  mdTheme.value = uiStore.theme
  mdCodeTheme.value = uiStore.theme === 'dark' ? 'atomOneDark' : 'github'
  // 代码块 hljs 配色的 <link> 由我们自己管（见 mdEditorSetup.ts 注释）；软导航后
  // Astro 的 head swap 会删掉这个运行时注入的 link，故每次挂载都要重建一次
  applyHljsCss(uiStore.theme === 'dark' ? 'dark' : 'light')
}

watch(() => uiStore.theme, syncMdTheme)

async function fetchPost() {
  try {
    post.value = await getPost(props.postId)
  } catch (e) {
    toast('获取文章详情失败', 'error')
  }
}

async function fetchChapter() {
  try {
    const [prev, next] = await Promise.all([getPrevPost(props.postId), getNextPost(props.postId)])
    prevPost.value = prev.post
    nextPost.value = next.post
  } catch (e) {
    prevPost.value = null
    nextPost.value = null
  }
}

function handleCatalog(list) {
  catalog.value = (list || []).map((item, index) => ({ ...item, id: `heading-${index + 1}` }))
}

function scrollToHeading(id) {
  const el = document.getElementById(id)
  if (el) {
    const navbarOffset = 76
    const top = el.getBoundingClientRect().top + window.scrollY - navbarOffset
    window.scrollTo({ top, behavior: 'smooth' })
  }
}

function handleScroll() {
  const headings = catalog.value
    .map(item => document.getElementById(item.id))
    .filter(Boolean)
  if (!headings.length) return

  const scrollTop = window.scrollY
  const navbarOffset = 80
  let current = ''

  for (const heading of headings) {
    const offsetTop = heading.getBoundingClientRect().top + scrollTop - navbarOffset
    if (scrollTop >= offsetTop) {
      current = heading.id
    }
  }

  activeHeading.value = current
}

onMounted(() => {
  syncMdTheme()
  // 访问计数只在浏览器端记录（fire & forget，静默失败不影响读者体验）
  recordPostView(props.postId).catch(() => {})
  if (!props.initialPost) fetchPost()
  // 上/下篇都没拿到（含 SSR 那一步 fail-soft 降级成空对象）→ 客户端补拉一次
  if (!props.initialPrev?.id && !props.initialNext?.id) fetchChapter()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.detail-container {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 24px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px var(--page-padding) 40px;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.meta-card {
  padding: 24px 28px;
  border-radius: 16px;
}

.post-title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0 0 14px;
  line-height: 1.4;
}

.meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  row-gap: 6px;
  font-size: 13px;
  color: var(--color-text);
}

/* 分享按钮推到 meta-row 右端（FriendsView 信息卡复制按钮同款形态） */
.share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin-left: auto;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: rgba(var(--color-primary-rgb), 0.14);
  color: var(--color-primary);
  cursor: pointer;
  font-size: 17px;
  transition: background 0.2s ease;
}

.share-btn:hover {
  background: rgba(var(--color-primary-rgb), 0.28);
}

/* 文末分享条（与 FriendsView 信息卡同一套浅绿底习惯用法） */
.share-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 16px;
  background: rgba(var(--color-primary-rgb), 0.08);
}

.share-banner__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(var(--color-primary-rgb), 0.14);
  color: var(--color-primary);
  font-size: 26px;
}

.share-banner__text {
  flex: 1;
  min-width: 0;
}

.share-banner__title {
  margin: 0;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-heading);
}

.share-banner__desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-text);
}

.share-banner__btn {
  flex-shrink: 0;
  padding: 12px 28px;
  border: none;
  border-radius: 12px;
  background: rgba(var(--color-primary-rgb), 0.16);
  color: var(--color-primary);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.share-banner__btn:hover {
  background: rgba(var(--color-primary-rgb), 0.28);
}

@media (max-width: 480px) {
  .share-banner {
    gap: 12px;
    padding: 14px 16px;
  }

  .share-banner__icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    font-size: 22px;
  }

  .share-banner__btn {
    padding: 10px 20px;
  }
}

.meta-separator {
  opacity: 0.5;
}

.views {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-muted);
}

.view-icon {
  font-size: 15px;
}

.content-card {
  padding: 24px 28px;
  border-radius: 16px;
  min-height: 400px;
}

.content-card :deep(.md-editor) {
  --md-bk-color: transparent;
  --md-color: var(--color-text);
  --md-hover-color: var(--color-heading);
  --md-bk-color-outstand: var(--bg-card-strong);
  --md-bk-hover-color: rgba(var(--color-primary-rgb), 0.15);
  --md-border-color: var(--border-light);
  --md-border-hover-color: rgba(var(--color-primary-rgb), 0.5);
  --md-border-active-color: var(--color-primary);
  --md-scrollbar-bg-color: var(--bg-card);
  --md-scrollbar-thumb-color: var(--border-divider);
  --md-scrollbar-thumb-hover-color: rgba(var(--color-primary-rgb), 0.3);
  --md-scrollbar-thumb-active-color: rgba(var(--color-primary-rgb), 0.4);
  background-color: transparent;
}

.toc-sidebar {
  position: relative;
}

.toc-card {
  position: sticky;
  top: 96px;
  padding: 20px;
  border-radius: 16px;
  max-height: calc(100vh - 116px);
  overflow-y: auto;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toc-item {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1.4;
}

.toc-item:hover {
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-heading);
}

.toc-item.active {
  background: rgba(var(--color-primary-rgb), 0.2);
  color: var(--color-heading);
  font-weight: 600;
}

.toc-item.level-1 {
  font-weight: 600;
}

.toc-item.level-2 {
  padding-left: 18px;
}

.toc-item.level-3 {
  padding-left: 32px;
  font-size: 12px;
}

.toc-item.level-4,
.toc-item.level-5,
.toc-item.level-6 {
  padding-left: 46px;
  font-size: 12px;
}

.toc-empty {
  padding: 12px 0;
  text-align: center;
  font-size: 12px;
  color: var(--color-text);
  opacity: 0.5;
}

.chapter-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chapter-item {
  padding: 14px 18px;
  border-radius: 12px;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.chapter-item.next {
  text-align: right;
  align-items: flex-end;
}

.chapter-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px var(--shadow-color);
}

.chapter-item.disabled {
  cursor: default;
  opacity: 0.45;
}

.chapter-item.disabled:hover {
  transform: none;
  box-shadow: 0 4px 12px var(--shadow-color);
}

.chapter-label {
  font-size: 12px;
  color: var(--color-muted);
}

.chapter-title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

@media (max-width: 768px) {
  .chapter-nav {
    grid-template-columns: 1fr;
  }

  .chapter-item.next {
    text-align: left;
    align-items: flex-start;
  }
}

@media (max-width: 1024px) {
  .detail-container {
    grid-template-columns: 1fr;
  }

  .toc-sidebar {
    display: none;
  }
}

@media (max-width: 768px) {
  .meta-card,
  .content-card {
    padding: 16px;
  }

  .post-title {
    font-size: 22px;
  }
}
</style>
