<template>
    <SitePageFrame>
        <template #banner>
            <HomeHero />
        </template>
<div class="home-layout">
            <aside class="left-sidebar">
                <PersonalCard />
                <TagBox :active-id="activeCategoryId" @select="onTagSelect" @loaded="onSectionLoaded" />
            </aside>
            <main class="center">
                <PostList :category-id="activeCategoryId" :search-query="searchQuery" @clear="onClear" @loaded="onSectionLoaded" />
            </main>
            <aside class="right-sidebar">
            </aside>
        </div>  
    </SitePageFrame>
    
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import PersonalCard from '@/components/home/PersonalCard.vue';
import TagBox from '@/components/home/TagBox.vue';
import HomeHero from '@/components/home/HomeHero.vue';
import PostList from '@/components/home/PostList.vue';
import SitePageFrame from '@/components/common/SitePageFrame.vue';

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

const activeCategoryId = ref(null)
const searchQuery = computed(() => (route.query.q ? String(route.query.q) : ''))

// 首页加载：等待文章列表 / 标签全部就绪后熄灭加载遮罩与进度条
const PENDING_SECTIONS = 2
const pendingSections = ref(PENDING_SECTIONS)
let loadingTimeout = null

function onSectionLoaded() {
  pendingSections.value -= 1
  if (pendingSections.value <= 0) {
    finishLoading()
  }
}

function finishLoading() {
  clearTimeout(loadingTimeout)
  uiStore.setPageLoading(false)
}

onMounted(() => {
  pendingSections.value = PENDING_SECTIONS
  uiStore.setPageLoading(true)
  // 兜底：8s 内未全部就绪则强制熄灭（防请求挂起卡死）
  loadingTimeout = setTimeout(finishLoading, 8000)
})

onUnmounted(() => {
  clearTimeout(loadingTimeout)
  uiStore.setPageLoading(false)
})

function onTagSelect(id) {
  activeCategoryId.value = id
}

function onClear() {
  activeCategoryId.value = null
  if (route.query.q) {
    router.push({ name: 'Home' })
  }
}
</script>
<style scoped>
    .home-layout {
    position: relative;
    isolation: isolate;
    display: grid;
    grid-template-columns: minmax(260px, 300px) minmax(0, 640px) minmax(240px, 280px);
    gap: 24px;
    max-width: 1320px;
    margin: 0 auto;
    padding: 28px var(--page-padding) 64px;
    min-height: 100vh;
    }

.home-layout::before,
.home-layout::after {
  content: '';
  position: absolute;
  z-index: -1;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(10px);
}

.home-layout::before {
  top: 80px;
  left: -120px;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(var(--color-primary-rgb), .12), transparent 70%);
}

.home-layout::after {
  right: -140px;
  bottom: 80px;
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, rgba(var(--color-accent-rgb), .1), transparent 70%);
}

.left-sidebar,
.right-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 96px;
  align-self: start;
  z-index: 1;
}

.center {
  min-width: 0;
  position: relative;
  z-index: 1;
}
/* 响应式降级
 * @md 1024px  平板/窄屏：隐藏左栏，内容 + 右栏两列
 * @sm 768px   手机：只保留中间的 PostList，两侧栏隐藏
 */
@media (max-width: 1024px) {
  .home-layout {
    grid-template-columns: 1fr 280px;
  }

  .left-sidebar {
    display: none;
  }
}

@media (max-width: 768px) {
  .home-layout {
    grid-template-columns: 1fr;
    padding-top: 20px;
  }

  .right-sidebar {
    display: none;
  }
}

@media (max-width: 480px) {
  .home-layout {
    padding-bottom: 40px;
  }
}
</style>
