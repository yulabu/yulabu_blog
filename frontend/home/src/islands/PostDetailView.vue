<template>
  <div class="detail-container">
    <main class="main-content">
      <!-- 文章本体是一张「纸面」（无圆角/无边框/无投影）：标题、元信息、正文同处一面，
           不再各自成卡。玻璃材质只留给真正独立的功能模块（分享条/评论区）。
           去卡片化改造 2026-10-10，依据见 .zcode/plans/plan-post-detail-redesign.md -->
      <article class="article-sheet">
        <header class="post-header">
          <h1 class="post-title">{{ post.title }}</h1>
          <div class="meta-row">
            <CategoryChip v-if="post.category" variant="solid">{{ post.category.name }}</CategoryChip>
            <span class="meta-item">{{ post.author }}</span>
            <span class="meta-item">{{ formatDate(post.createdAt) }}</span>
            <span class="meta-item views">
              <AppIcon icon="material-symbols:visibility-outline" class="view-icon" />
              {{ formatViewCount(post.viewCount) }} 次阅读
            </span>
            <button type="button" class="share-btn" aria-label="分享文章" @click="shareVisible = true">
              <AppIcon icon="material-symbols:ios-share" />
            </button>
          </div>
          <hr class="hairline" />
        </header>

        <div class="post-prose" :class="{ 'hide-lead-title': hideLeadTitle }">
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
        </div>
      </article>

      <!-- 上下篇移到文末（读完再决定去哪一篇；改前它们在标题与正文之间各占一张卡）。
           只有专栏内文章会有，两边都没有时整块不渲染 -->
      <nav v-if="prevPost || nextPost" class="chapter-row">
        <a
          v-if="prevPost"
          class="chapter-link prev"
          :href="`/post/${prevPost.id}`"
          @click="markPostSplash(prevPost)"
        >
          <span class="chapter-label">
            <AppIcon icon="material-symbols:arrow-back" class="chapter-arrow" />上一篇
          </span>
          <span class="chapter-title">{{ prevPost.title }}</span>
        </a>
        <a
          v-if="nextPost"
          class="chapter-link next"
          :href="`/post/${nextPost.id}`"
          @click="markPostSplash(nextPost)"
        >
          <span class="chapter-label">
            下一篇<AppIcon icon="material-symbols:arrow-forward" class="chapter-arrow" />
          </span>
          <span class="chapter-title">{{ nextPost.title }}</span>
        </a>
      </nav>

      <!-- 文末分享条：与 meta-row 小按钮共用同一弹层，显眼入口放在文章读完的位置（本次不改） -->
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

    <!-- 目录：素列表 + 短竖线活动标（不用底色/阴影，用户定案 2026-10-10） -->
    <aside class="toc-sidebar">
      <p class="toc-label">目录</p>
      <ul v-if="catalog.length" class="toc-list">
        <li v-for="item in catalog" :key="item.id" :class="['toc-item', `level-${item.level}`]">
          <a
            class="toc-link"
            :class="{ active: activeHeading === item.id }"
            :href="`#${item.id}`"
            :title="item.text"
            @click="scrollToHeading($event, item.id)"
          >
            {{ item.text }}
          </a>
        </li>
      </ul>
      <p v-else class="toc-empty">暂无目录</p>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
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

// 正文首块若是与文章标题重复的 `# 标题`（站内 9/10 篇文章如此），隐藏它，
// 避免标题在一屏里出现两遍。判据完全由文章数据派生：SSR 与客户端同值，
// 只用来挂一个类，不产生水合差异
const hideLeadTitle = computed(() => {
  const firstBlock = (post.value.content || '').split('\n').find((line) => line.trim() !== '')
  const matched = firstBlock && firstBlock.match(/^#\s+(.+?)\s*$/)
  return !!matched && matched[1] === (post.value.title || '').trim()
})

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

// md-editor 只吐 text/level（外加两个 markdown-it Token，不往响应式 ref 里塞），
// id 与 mdHeadingId 生成规则一致（heading-<序号>）
function handleCatalog(list) {
  const items = (list || []).map((item, index) => ({
    text: item.text,
    level: item.level,
    id: `heading-${index + 1}`
  }))
  // 首块标题被隐藏时，目录同步丢掉指向它的那一项（否则第一项点了没反应）
  catalog.value = hideLeadTitle.value && items[0]?.level === 1 ? items.slice(1) : items
}

// 目录活动态：取「最后一条已滚过顶部阈值的标题」（语义与改前一致，阈值 96px = 吸顶导航栏）。
// 滚动重算用 rAF 节流（改前是每个 scroll 事件都全量遍历 getElementById）。
// 不用 IntersectionObserver：IO 只在元素跨越观察带时回调，「瞬间跳过整段」（翻页键、
// 拖滚动条）与「锚点落点恰好压在阈值上」两种情况都会漏更新，活动项停在前一项。
let rafId = 0

function syncActiveHeading() {
  const headings = catalog.value.map((item) => document.getElementById(item.id)).filter(Boolean)
  const threshold = 96 + 1 // 96px = 吸顶导航栏高度
  let current = ''
  for (const heading of headings) {
    if (heading.getBoundingClientRect().top <= threshold) current = heading.id
  }
  activeHeading.value = current
}

function onScroll() {
  if (rafId) return
  rafId = window.requestAnimationFrame(() => {
    rafId = 0
    syncActiveHeading()
  })
}

// 目录条目是真链接（可键盘访问、无 JS 也能跳），平滑滚动只是 JS 增强：
// 位移交给 CSS 的 scroll-margin-top（加在正文标题上），并尊重 reduced-motion
function scrollToHeading(event, id) {
  const el = document.getElementById(id)
  if (!el) return
  event.preventDefault()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
  // 落点是已知的，立即点亮，不等滚动动画结束
  activeHeading.value = id
}

watch(catalog, async () => {
  await nextTick()
  syncActiveHeading()
})

onMounted(() => {
  syncMdTheme()
  // 访问计数只在浏览器端记录（fire & forget，静默失败不影响读者体验）
  recordPostView(props.postId).catch(() => {})
  if (!props.initialPost) fetchPost()
  // 上/下篇都没拿到（含 SSR 那一步 fail-soft 降级成空对象）→ 客户端补拉一次
  if (!props.initialPrev?.id && !props.initialNext?.id) fetchChapter()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (rafId) window.cancelAnimationFrame(rafId)
  rafId = 0
})
</script>

<style scoped>
/* ========== 骨架：主列 + 素目录栏 ========== */
.detail-container {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 236px;
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px var(--page-padding) 64px;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

/* ========== 纸面：标题 + 元信息 + 正文同处一面 ==========
   刻意无圆角、无边框、无投影 —— 它是「纸面」，不是浮起来的卡片。
   卡片感来自「多个浮面 + 间隔」，一面连续的白纸不会读作卡（对比参考站做法） */
.article-sheet {
  background: var(--bg-card);
  padding: 36px 40px 44px;
}

.post-title {
  font-family: var(--font-kai);
  font-size: 32px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--color-heading);
  margin: 0 0 14px;
}

.meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 12px;
  font-size: 13px;
  color: var(--color-muted);
}

.meta-item {
  white-space: nowrap;
}

.views {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.view-icon {
  font-size: 15px;
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

.hairline {
  height: 1px;
  margin: 18px 0 0;
  border: 0;
  background: rgba(var(--color-primary-rgb), 0.18);
}

/* ========== 正文排版：统一到站点的文楷 / 色阶 / 中文行高 ==========
   改前正文是 md-editor 库默认值（16px / 行高 1.5 / sans-serif / #222），
   与站点令牌无关；这里逐项收进站点体系（字号/行高/字距/代码块/表格/引用/链接）。
   代码块面色走令牌 --bg-code（亮/暗各一份，见 styles/tokens.css） */

/* 正文子树自成一个层叠上下文：md-editor 给代码块头栏（sticky）写死了
   z-index: 10000，目录 10002、下拉与模态 20000+ 属同一类，而站点浮层都在其下
   （分享弹层 2200、过渡卡片 3000、导航栏 1000、播放器 1100）——没有这层 containment
   时它们会直接穿到弹层之上（去卡片化之前的玻璃卡靠 backdrop-filter 意外挡住了）。
   只能挂在生成盒子的元素上：单列骨架 .page-frame__main 是 display:contents，
   它的 position/z-index 失效（实测），所以落在这里 */
.post-prose {
  isolation: isolate;
}

.post-prose :deep(.md-editor) {
  --md-bk-color: transparent;
  --md-color: var(--color-text);
  --md-hover-color: var(--color-heading);
  --md-bk-color-outstand: var(--bg-card-strong);
  --md-bk-hover-color: rgba(var(--color-primary-rgb), 0.15);
  --md-border-color: var(--border-light);
  --md-border-hover-color: rgba(var(--color-primary-rgb), 0.5);
  --md-border-active-color: var(--color-primary);
  --md-scrollbar-bg-color: transparent;
  --md-scrollbar-thumb-color: var(--border-divider);
  --md-scrollbar-thumb-hover-color: rgba(var(--color-primary-rgb), 0.3);
  --md-scrollbar-thumb-active-color: rgba(var(--color-primary-rgb), 0.4);
  background-color: transparent;
}

.post-prose :deep(.md-editor-preview) {
  font-size: 17px;
  line-height: 1.9;
  color: var(--color-text);
  word-break: break-word;
}

/* 文楷必须逐元素落到正文子树上：站点 reset 的 `* { font-family: sans-serif }`
   是直接声明在每个元素上的（global.css @layer base），会盖掉从容器继承的字体。
   排除 code/pre/kbd（保留等宽）与代码块头栏（UI 标签用系统栈） */
.post-prose :deep(.md-editor-preview *) {
  font-family: var(--font-kai);
}

.post-prose :deep(.md-editor-preview) code,
.post-prose :deep(.md-editor-preview) pre,
.post-prose :deep(.md-editor-preview) kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.post-prose :deep(.md-editor-code-head) {
  font-family: var(--font-ui);
}

.post-prose :deep(.md-editor-preview > *:last-child) {
  margin-bottom: 0;
}

.post-prose :deep(.md-editor-preview p) {
  margin: 0 0 18px;
}

/* 各级标题只靠字号/字重/留白分级，不加装饰 */
.post-prose :deep(.md-editor-preview h1),
.post-prose :deep(.md-editor-preview h2),
.post-prose :deep(.md-editor-preview h3),
.post-prose :deep(.md-editor-preview h4) {
  font-family: var(--font-kai);
  font-weight: 700;
  line-height: 1.5;
  color: var(--color-heading);
  border-bottom: 0;
  padding-bottom: 0;
  /* 目录锚点跳转时让开吸顶导航栏（原生锚点与 scrollIntoView 都认它） */
  scroll-margin-top: 96px;
}

.post-prose :deep(.md-editor-preview h1) { font-size: 26px; margin: 36px 0 14px; }
.post-prose :deep(.md-editor-preview h2) { font-size: 22px; margin: 40px 0 14px; }
.post-prose :deep(.md-editor-preview h3) { font-size: 18px; margin: 30px 0 10px; }
.post-prose :deep(.md-editor-preview h4) { font-size: 17px; margin: 24px 0 10px; }
.post-prose :deep(.md-editor-preview > h1:first-child),
.post-prose :deep(.md-editor-preview > h2:first-child) { margin-top: 0; }

/* 正文首块标题与文章标题重复时隐藏（判据见脚本 hideLeadTitle） */
.post-prose.hide-lead-title :deep(.md-editor-preview > h1:first-child) {
  display: none;
}

.post-prose :deep(.md-editor-preview a) {
  color: var(--color-primary);
  text-decoration: none;
  border-bottom: 1px solid rgba(var(--color-primary-rgb), 0.35);
  transition: color 0.2s ease, border-color 0.2s ease;
}

.post-prose :deep(.md-editor-preview a:hover) {
  color: var(--color-primary-hover);
  border-bottom-color: var(--color-primary-hover);
}

.post-prose :deep(.md-editor-preview strong) {
  font-weight: 700;
  color: var(--color-heading);
}

.post-prose :deep(.md-editor-preview ul),
.post-prose :deep(.md-editor-preview ol) {
  margin: 0 0 18px;
  padding-left: 2em;
}

.post-prose :deep(.md-editor-preview li) {
  margin: 4px 0;
}

.post-prose :deep(.md-editor-preview li::marker) {
  color: var(--color-primary);
}

.post-prose :deep(.md-editor-preview blockquote) {
  margin: 0 0 18px;
  padding: 12px 18px;
  border-left: 3px solid rgba(var(--color-primary-rgb), 0.35);
  border-radius: 0;
  background: rgba(var(--color-primary-rgb), 0.06);
  color: var(--color-heading);
}

.post-prose :deep(.md-editor-preview blockquote p:last-child) {
  margin-bottom: 0;
}

.post-prose :deep(.md-editor-preview hr) {
  height: 1px;
  margin: 30px 0;
  border: 0;
  background: rgba(var(--color-primary-rgb), 0.18);
}

/* 行内代码：:not(pre) > code 把块级代码排除在外 —— 否则这里的 padding
   会盖掉库给「显示行号」留的 49px 左内边距（块级代码在下面单独覆盖） */
.post-prose :deep(.md-editor-preview :not(pre) > code) {
  font-size: 0.9em;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-heading);
}

/* 代码块：只有一层浅底 + 一条头栏发丝线，不再叠卡片阴影 */
.post-prose :deep(.md-editor-code) {
  margin: 20px 0;
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-code);
}

.post-prose :deep(.md-editor-code-head) {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(var(--color-primary-rgb), 0.12);
  border-radius: 0;
  background: transparent;
  color: var(--color-muted);
}

.post-prose :deep(.md-editor-code pre) {
  margin: 0;
  background: transparent;
}

/* code.hljs 的底色来自 hljs 主题 css（github / atomOneDark 各写死一份），
   这里连同文字色一起收归站点令牌；行号留白等库内布局（padding）保持不动 */
.post-prose :deep(.md-editor-code code) {
  font-size: 13.5px;
  line-height: 1.7;
  border-radius: 0;
  background: transparent;
  color: var(--color-heading);
}

/* 表格只要行分隔线，不要竖线与外框 */
.post-prose :deep(.md-editor-preview table) {
  width: 100%;
  margin: 0 0 18px;
  border-collapse: collapse;
  font-size: 15px;
}

.post-prose :deep(.md-editor-preview th),
.post-prose :deep(.md-editor-preview td) {
  padding: 8px 12px;
  border: 0;
  border-bottom: 1px solid rgba(var(--color-primary-rgb), 0.15);
  text-align: left;
}

.post-prose :deep(.md-editor-preview thead th) {
  background: rgba(var(--color-primary-rgb), 0.08);
  font-weight: 700;
  color: var(--color-heading);
}

.post-prose :deep(.md-editor-preview img) {
  border-radius: 10px;
}

.post-prose :deep(.md-editor-preview figure) {
  margin: 0 0 18px;
}

/* ========== 文末上下篇：一行素文本，不再各占一张卡 ========== */
.chapter-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--color-primary-rgb), 0.18);
}

.chapter-link {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  max-width: 48%;
  text-decoration: none;
}

.chapter-link.next {
  margin-left: auto;
  align-items: flex-end;
  text-align: right;
}

.chapter-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--color-muted);
}

.chapter-arrow {
  font-size: 15px;
}

.chapter-title {
  max-width: 100%;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.chapter-link:hover .chapter-title {
  color: var(--color-primary);
}

/* ========== 文末分享条（本次不改，样式与改前逐字一致） ========== */
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
  font-family: var(--font-ui);
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

/* ========== 目录：素列表 + 短竖线活动标 ========== */
.toc-sidebar {
  position: sticky;
  top: 96px;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 130px);
  min-width: 0;
}

.toc-label {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--color-muted);
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  min-height: 0;
  overflow-y: auto;
}

.toc-item {
  margin: 0;
}

.toc-link {
  position: relative;
  display: block;
  padding: 6px 0 6px 14px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

/* 当前项用一根短竖线表示：无底色、无阴影、无圆角块（用户定案 2026-10-10） */
.toc-link::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 2px;
  height: 14px;
  border-radius: 1px;
  background: var(--color-primary);
  transform: translateY(-50%) scaleY(0);
  transition: transform 0.2s var(--ease-standard);
}

.toc-link.active::before {
  transform: translateY(-50%) scaleY(1);
}

/* 层级：一级（h1/h2）加重，三级以下缩进降级 */
.toc-item.level-1 .toc-link,
.toc-item.level-2 .toc-link {
  font-weight: 600;
}

.toc-item.level-3 .toc-link,
.toc-item.level-4 .toc-link,
.toc-item.level-5 .toc-link,
.toc-item.level-6 .toc-link {
  padding-left: 26px;
  font-size: 12.5px;
  font-weight: 400;
  color: var(--color-muted);
}

.toc-item.level-3 .toc-link::before,
.toc-item.level-4 .toc-link::before,
.toc-item.level-5 .toc-link::before,
.toc-item.level-6 .toc-link::before {
  left: 12px;
}

/* hover/active 放在层级规则之后，并带上 .toc-item 前缀 —— 层级规则
   （如 .toc-item.level-3 .toc-link）权重更高，靠后的同级规则才能改色/加粗 */
.toc-item .toc-link:hover {
  color: var(--color-heading);
}

.toc-item .toc-link.active {
  color: var(--color-heading);
  font-weight: 600;
}

.toc-empty {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted);
  opacity: 0.8;
}

/* ========== 响应式 ========== */
@media (max-width: 1024px) {
  .detail-container {
    grid-template-columns: minmax(0, 1fr);
  }

  .toc-sidebar {
    display: none;
  }
}

@media (max-width: 768px) {
  .article-sheet {
    padding: 22px 18px 28px;
  }

  .post-title {
    font-size: 24px;
  }

  .meta-row {
    gap: 4px 10px;
    font-size: 12.5px;
  }

  .post-prose :deep(.md-editor-preview) {
    font-size: 16px;
    line-height: 1.85;
  }

  .post-prose :deep(.md-editor-preview h1) { font-size: 22px; }
  .post-prose :deep(.md-editor-preview h2) { font-size: 20px; }
  .post-prose :deep(.md-editor-preview h3) { font-size: 17px; }

  .chapter-row {
    flex-direction: column;
    gap: 14px;
  }

  .chapter-link,
  .chapter-link.next {
    max-width: 100%;
    margin-left: 0;
    align-items: flex-start;
    text-align: left;
  }
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
</style>
