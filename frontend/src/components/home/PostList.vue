<template>
  <section class="post-list">
    <div class="header">
      <Icon icon="material-symbols:article-outline" class="icon" />
      <h3 class="section-title">{{ sectionTitle }}</h3>
      <div class="header-actions">
        <span class="count" v-if="total !== null">共 {{ total }} 篇</span>
        <button v-if="hasFilter" class="clear-btn" @click="onClear">
          <Icon icon="material-symbols:close" class="clear-icon" />
          清除
        </button>
      </div>
    </div>
    <div v-if="!posts.length" class="empty">
      <Icon icon="material-symbols:description-off-outline" class="empty-icon" />
      <span>{{ emptyText }}</span>
    </div>
    <article v-else v-for="post in posts" :key="post.id" class="post-card" @click="goToDetail(post.id)">
      <div class="post-head">
        <h4 class="title">{{ post.title }}</h4>
        <span v-if="post.category" class="tag">{{ post.category.name }}</span>
      </div>
      <p class="excerpt">{{ post.summary }}</p>
      <div class="meta">
        <span class="author">{{ post.author }}</span>
        <span class="date">{{ formatDate(post.createdAt) }}</span>
      </div>
    </article>
  </section>
</template>
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { formatDate } from '@/utils/date'
import { getPosts } from '@/api/post'
import { useMessageBox } from '@/composables/useMessageBox'

const props = defineProps({
  categoryId: {
    type: Number,
    default: null
  },
  searchQuery: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['clear'])

const posts = ref([])
const total = ref(0)
const router = useRouter()
const { toast } = useMessageBox()

const hasFilter = computed(() => props.categoryId !== null || props.searchQuery !== '')

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

async function fetchPosts() {
  try {
    const data = await getPosts(1, 20, props.categoryId, props.searchQuery || undefined)
    posts.value = data.posts
    total.value = data.total
  } catch (e) {
    toast('获取文章列表失败', 'error')
  }
}

function onClear() {
  emit('clear')
}

function goToDetail(id) {
  router.push(`/post/${id}`)
}

onMounted(fetchPosts)
watch(() => [props.categoryId, props.searchQuery], fetchPosts, { deep: true })
</script>
<style scoped>
.post-list {
  width: 100%;
  padding: 24px 20px;
  border-radius: 5%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(80, 140, 134, .25);
}

.icon {
  color: var(--color-primary);
  font-size: 22px;
}

.section-title {
  font-family: '华文琥珀', 'STHupo', sans-serif;
  font-weight: 400;
  color: var(--color-primary);
  font-size: 20px;
  margin: 0;
  letter-spacing: 2px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.count {
  font-size: 12px;
  color: var(--color-text);
  background: rgba(80, 140, 134, .12);
  padding: 2px 8px;
  border-radius: 10px;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: rgba(99, 149, 86, 0.12);
  color: var(--color-text);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(99, 149, 86, 0.25);
  color: var(--color-heading);
}

.clear-icon {
  font-size: 14px;
}

.post-card {
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-top: 1px solid white;
  border-left: 1px solid white;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, .48),
      rgba(255, 255, 255, .24),
      rgba(255, 255, 255, .16));
  backdrop-filter: blur(16px);
  transition: transform .2s, box-shadow .2s;
  cursor: pointer;
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
}

.post-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}

.title {
  font-family: '华文琥珀', 'STHupo', sans-serif;
  font-weight: 400;
  font-size: 18px;
  color: var(--color-primary);
  margin: 0;
  line-height: 1.4;
  transition: color .2s;
}

.post-card:hover .title {
  color: rgb(71, 120, 65);
}

.tag {
  color: white;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  letter-spacing: 1px;
  white-space: nowrap;
  flex-shrink: 0;
  background: rgba(99, 149, 86, 0.85);
}

.excerpt {
  margin: 0 0 10px 0;
  font-family: '微软雅黑', sans-serif;
  font-size: 13px;
  color: rgb(99, 118, 94);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: '微软雅黑', sans-serif;
  font-size: 12px;
}

.date {
  color: var(--color-text);
  opacity: .6;
  font-size: 11px;
}

.author {
  color: var(--color-text);
  opacity: .65;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  color: var(--color-text);
  opacity: .45;
  font-size: 13px;
  gap: 8px;
}

.empty-icon {
  font-size: 32px;
}
</style>