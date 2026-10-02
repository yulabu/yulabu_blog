<template>
  <div class="home-layout">
    <main class="center">
      <TagBox class="mobile-tag-box" :initial-tags="initialTags" @select="onTagSelect" />
      <PostList
        :category-id="activeTagId"
        :search-query="searchQuery"
        :initial-data="initialPosts"
        @clear="onClear"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { navigate } from 'astro:transitions/client'
import TagBox from '@/components/home/TagBox.vue'
import PostList from '@/components/home/PostList.vue'
import { activeTagId, clearActiveTag } from '@/stores/tagFilter'

// 构建期烘焙数据（index.astro 注入），原样透传给子组件；空值由子组件兜底自行拉取。
// 不写 default：Astro 对 JS SFC 的函数式 default 会破坏 .vue 的类型生成
defineProps({
  initialPosts: { type: Object },
  initialTags: { type: Array }
})

// 说明：本组件现在只负责「主内容」。全屏 Hero、常驻个人卡片左栏已上移到
// Astro 层（pages/index.astro + components/astro/PageFrame.astro）——
// 卡片要跨页 persist 就必须由 .astro 渲染，Hero 跟着一起走是为了保持
// 「刊头全宽、下方两列」的原结构不变。

// 水合稳态初值：SSR（静态预渲染）与客户端首帧一致为无搜索态，
// 真实搜索词在 onMounted 从 URL 同步（PostList 头部随后切换到搜索结果态）
const searchQuery = ref('')

onMounted(() => {
  searchQuery.value = new URLSearchParams(window.location.search).get('q') || ''
})

// 标签选中态是跨岛共享的（左栏 TagBox 与中栏 PostList 分属不同岛）
function onTagSelect(id) {
  activeTagId.value = id
}

function onClear() {
  clearActiveTag()
  if (searchQuery.value) {
    navigate('/')
  }
}
</script>

<style scoped>
/* 主内容栅格：中心列 + 一列**预留空列**。
   注意别把第二条轨道删掉：在 1280px 视口下，可用宽度是 908px，
   `minmax(0,640px) minmax(240px,280px)` 会把首轨压到 604px（= 908 - 24 - 280）——
   这正是当前文章卡的换行位置。删掉轨道会让内容列变宽到 640px、卡片行数变化
   （实测页面高度 +19px），属于视觉变化。左栏由 PageFrame 提供。 */
.home-layout {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 640px) minmax(240px, 280px);
  gap: 24px;
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

.center {
  min-width: 0;
  position: relative;
  z-index: 1;
}

.mobile-tag-box {
  display: none;
}

/* 响应式降级（沿用原约定）
 * @md 1024px  左栏已由 PageFrame 隐藏，主内容 + 预留空列两列
 * @sm 768px   只保留中栏，空列收起，标签移到内容顶部
 */
@media (max-width: 1024px) {
  .home-layout {
    grid-template-columns: minmax(0, 1fr) 280px;
  }
}

@media (max-width: 768px) {
  .home-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .mobile-tag-box {
    display: block;
    margin-bottom: 16px;
  }
}
</style>
