<template>
  <div class="page-bg">
    <div class="detail-container">
      <main class="main-content">
        <div class="meta-card">
          <h1 class="post-title">{{ post.title }}</h1>
          <div class="meta-row">
            <span v-if="post.category" class="category-tag">{{ post.category.name }}</span>
            <span class="meta-separator">·</span>
            <span class="author">{{ post.author }}</span>
            <span class="meta-separator">·</span>
            <span class="date">{{ formatDate(post.createdAt) }}</span>
          </div>
        </div>
        <div class="content-card">
          <MdPreview
            :modelValue="post.content"
            theme="light"
            previewTheme="github"
            codeTheme="github"
            :showCodeRowNumber="true"
            @onGetCatalog="handleCatalog"
          />
        </div>
      </main>
      <aside class="toc-sidebar">
        <div class="toc-card">
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
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

const route = useRoute()

const post = ref({
  title: '',
  content: '',
  category: null,
  author: '',
  createdAt: ''
})
const catalog = ref([])
const activeHeading = ref('')

async function fetchPost() {
  try {
    const res = await fetch(`/api/posts/${route.params.id}`)
    if (!res.ok) throw new Error('获取文章失败')
    const data = await res.json()
    post.value = data
  } catch (e) {
    console.error('获取文章详情失败:', e)
  }
}

function handleCatalog(list) {
  catalog.value = list || []
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
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

function formatDate(str) {
  if (!str) return ''
  const d = new Date(str)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.page-bg {
  width: 100%;
  min-height: 100vh;
  background-color: rgb(202, 242, 203);
  padding: 20px 24px 40px;
}

.detail-container {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 24px;
  max-width: 1280px;
  margin: 0 auto;
  padding-top: 76px;
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-top: 1px solid white;
  border-left: 1px solid white;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, .6),
      rgba(255, 255, 255, .3),
      rgba(255, 255, 255, .2));
  backdrop-filter: blur(16px);
}

.post-title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: rgb(45, 90, 65);
  margin: 0 0 14px;
  line-height: 1.4;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgb(65, 110, 105);
}

.category-tag {
  padding: 3px 10px;
  border-radius: 10px;
  background: rgba(99, 149, 86, 0.85);
  color: white;
  font-size: 12px;
}

.meta-separator {
  opacity: 0.5;
}

.content-card {
  padding: 24px 28px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-top: 1px solid white;
  border-left: 1px solid white;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, .6),
      rgba(255, 255, 255, .3),
      rgba(255, 255, 255, .2));
  backdrop-filter: blur(16px);
  min-height: 400px;
}

.toc-sidebar {
  position: relative;
}

.toc-card {
  position: sticky;
  top: 96px;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-top: 1px solid white;
  border-left: 1px solid white;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, .6),
      rgba(255, 255, 255, .3),
      rgba(255, 255, 255, .2));
  backdrop-filter: blur(16px);
  max-height: calc(100vh - 116px);
  overflow-y: auto;
}

.toc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(80, 140, 134, .25);
  margin-bottom: 12px;
}

.toc-header .line {
  width: 4px;
  height: 18px;
  background: rgb(99, 149, 86);
  border-radius: 2px;
}

.toc-header h4 {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-weight: 600;
  color: rgb(99, 149, 86);
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
  color: rgb(65, 110, 105);
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1.4;
}

.toc-item:hover {
  background: rgba(99, 149, 86, 0.12);
  color: rgb(45, 90, 65);
}

.toc-item.active {
  background: rgba(99, 149, 86, 0.2);
  color: rgb(45, 90, 65);
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
  color: rgb(65, 110, 105);
  opacity: 0.5;
}

@media (max-width: 1024px) {
  .detail-container {
    grid-template-columns: 1fr;
  }

  .toc-sidebar {
    display: none;
  }
}
</style>
