<template>
  <SitePageFrame>
    <div class="detail-container">
      <main class="main-content">
        <GlassPanel class="meta-card">
          <h1 class="post-title">{{ post.title }}</h1>
          <div class="meta-row">
            <span v-if="post.category" class="category-tag">{{ post.category.name }}</span>
            <span class="meta-separator">·</span>
            <span class="author">{{ post.author }}</span>
            <span class="meta-separator">·</span>
            <span class="date">{{ formatDate(post.createdAt) }}</span>
          </div>
        </GlassPanel>
        <nav v-if="prevPost || nextPost" class="chapter-nav">
          <GlassPanel
            v-if="prevPost"
            class="chapter-item prev"
            @click="goChapter(prevPost.id)"
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
            class="chapter-item next"
            @click="goChapter(nextPost.id)"
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
            :theme="uiStore.theme"
            previewTheme="github"
            :codeTheme="uiStore.theme === 'dark' ? 'atomOneDark' : 'github'"
            :showCodeRowNumber="true"
            :mdHeadingId="(h) => `heading-${h.index}`"
            @onGetCatalog="handleCatalog"
          />
        </GlassPanel>
      </main>
      <aside class="toc-sidebar">
        <GlassPanel class="toc-card">
          <div class="toc-header">
            <span class="line"></span>
            <h4>目录</h4>
          </div>
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
  </SitePageFrame>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { formatDate } from '@/utils/date'
import { getPost } from '@/api/post'
import { getPrevPost, getNextPost } from '@/api/column'
import { useMessageBox } from '@/composables/useMessageBox'
import { useUiStore } from '@/stores/ui'
import GlassPanel from '@/components/common/GlassPanel.vue'
import SitePageFrame from '@/components/common/SitePageFrame.vue'

const route = useRoute()
const { toast } = useMessageBox()
const uiStore = useUiStore()

const post = ref({
  title: '',
  content: '',
  category: null,
  author: '',
  createdAt: ''
})
const catalog = ref([])
const activeHeading = ref('')
const prevPost = ref(null)
const nextPost = ref(null)

async function fetchPost() {
  try {
    post.value = await getPost(Number(route.params.id))
  } catch (e) {
    toast('获取文章详情失败', 'error')
  }
}

async function fetchChapter() {
  const id = Number(route.params.id)
  try {
    const [prev, next] = await Promise.all([getPrevPost(id), getNextPost(id)])
    prevPost.value = prev.post
    nextPost.value = next.post
  } catch (e) {
    prevPost.value = null
    nextPost.value = null
  }
}

function goChapter(id) {
  router.push(`/post/${id}`)
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
  fetchPost()
  fetchChapter()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

watch(() => route.params.id, () => {
  fetchPost()
  fetchChapter()
  activeHeading.value = ''
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
  gap: 8px;
  font-size: 13px;
  color: var(--color-text);
}

.category-tag {
  padding: 3px 10px;
  border-radius: 10px;
  background: var(--color-primary);
  color: white;
  font-size: 12px;
}

.meta-separator {
  opacity: 0.5;
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

.toc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border-divider);
  margin-bottom: 12px;
}

.toc-header .line {
  width: 4px;
  height: 18px;
  background: var(--color-primary);
  border-radius: 2px;
}

.toc-header h4 {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-weight: 600;
  color: var(--color-primary);
  font-size: 16px;
  margin: 0;
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
