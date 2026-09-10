<template>
    <SitePageFrame>
        <template #banner>
            <HomeHero />
        </template>
<div class="home-layout">
            <aside class="left-sidebar">
                <PersonalCard />
                <TagBox :active-id="activeCategoryId" @select="onTagSelect" />
            </aside>
            <main class="center">
                <TagBox class="mobile-tag-box" :active-id="activeCategoryId" @select="onTagSelect" />
                <PostList :category-id="activeCategoryId" :search-query="searchQuery" @clear="onClear" />
            </main>
            <aside class="right-sidebar">
            </aside>
        </div>  
    </SitePageFrame>
    
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { navigate } from 'astro:transitions/client'
import PersonalCard from '@/components/home/PersonalCard.vue';
import TagBox from '@/components/home/TagBox.vue';
import HomeHero from '@/components/home/HomeHero.vue';
import PostList from '@/components/home/PostList.vue';
import SitePageFrame from '@/components/common/SitePageFrame.vue';

const activeCategoryId = ref(null)
// 水合稳态初值：SSR（静态预渲染）与客户端首帧一致为无搜索态，
// 真实搜索词在 onMounted 从 URL 同步（PostList 头部随后切换到搜索结果态）
const searchQuery = ref('')

onMounted(() => {
  searchQuery.value = new URLSearchParams(window.location.search).get('q') || ''
})

function onTagSelect(id) {
  activeCategoryId.value = id
}

function onClear() {
  activeCategoryId.value = null
  if (searchQuery.value) {
    navigate('/')
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

.mobile-tag-box {
  display: none;
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

  .mobile-tag-box {
    display: block;
    margin-bottom: 16px;
  }
}

@media (max-width: 480px) {
  .home-layout {
    padding-bottom: 40px;
  }
}
</style>
