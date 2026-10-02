<template>
  <main class="page-container page-container--wide">
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

    <ContentState v-else-if="links.length === 0" kind="empty" size="page">
      暂无友链
    </ContentState>

    <div v-else class="card-grid">
      <GlassPanel
        as="a"
        v-for="link in links"
        :key="link.id"
        class="friend-card"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div class="card-preview">
          <img
            v-if="coverSrc(link) && !failedAvatars.has(coverSrc(link))"
            :src="coverSrc(link)"
            :alt="link.name"
            class="preview-img"
            loading="lazy"
            @error="failedAvatars.add(coverSrc(link))"
          />
          <CoverFallback v-else :text="link.name.charAt(0)" />
        </div>

        <img
          v-if="link.avatar && !failedAvatars.has(link.avatar)"
          :src="link.avatar"
          class="card-avatar"
          loading="lazy"
          @error="failedAvatars.add(link.avatar)"
        />

        <div class="card-body card-info">
          <h3 class="card-title">{{ link.name }}</h3>
          <p class="card-text">{{ link.description || '这个站点还没有简介' }}</p>
        </div>
      </GlassPanel>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getFriendLinks } from '@/api/friend'
import { createSilentSync } from '@/utils/liveData'
import ContentState from '@/components/ui/ContentState.vue'
import CoverFallback from '@/components/ui/CoverFallback.vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const props = defineProps({
  // 构建期烘焙的友链列表（friends.astro 注入），页面必定传入（取数失败传空数组）。
  // 不写 default：Astro 对 JS SFC 的函数式 default 会破坏 .vue 的类型生成
  initialLinks: { type: Array }
})

// 有烘焙数据就直接渲染 → 预渲染 HTML 里就有内容，首屏不闪「加载中」
const links = ref(props.initialLinks || [])
const loading = ref(!links.value.length)
const error = ref('')
// 外链图加载失败的 URL（回落站名首字；友链图片一律外链，防盗链/死链不可避免）
const failedAvatars = ref(new Set())

// 大封面取图：背景图优先，无背景图时用头像顶上（头像同时在左下角圆形展示）
function coverSrc(link) {
  return link.preview_image || link.avatar || null
}

// 友链的排序/字段都可能被后台改动，指纹带上会变的字段
function fingerprintOf(list) {
  return (list ?? []).map((l) => `${l.id}:${l.name}:${l.avatar ?? ''}`).join(',')
}

const silentSync = createSilentSync({
  baked: fingerprintOf(props.initialLinks),
  load: () => getFriendLinks(),
  key: fingerprintOf,
  apply: (list) => {
    links.value = list
  }
})

async function loadFirstPaint() {
  loading.value = true
  error.value = ''
  try {
    links.value = await getFriendLinks()
  } catch (e) {
    error.value = '友链加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (props.initialLinks.length) silentSync()
  else loadFirstPaint()
})
</script>

<style scoped>
.friend-card {
  border-radius: 16px;
  overflow: hidden;
  text-decoration: none;
  transition: transform 0.25s, box-shadow 0.25s;
  display: flex;
  flex-direction: column;
}

.friend-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px var(--shadow-color);
}

.card-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: rgba(var(--color-primary-rgb), 0.08);
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.friend-card:hover .preview-img {
  transform: scale(1.05);
}

.card-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 3px solid var(--bg-card-strong);
  margin-top: -26px;
  margin-left: 16px;
  position: relative;
  z-index: 1;
  background: var(--bg-card-strong);
  object-fit: cover;
}

/* 与专栏卡的区别：正文区更紧（卡高更矮）——这是必要的业务差异，其余排版走 .card-body */
.card-info {
  padding: 12px 16px 16px;
  /* 卡片正文沿用雅黑栈（改名前后一致：原 .card-name/.card-desc 各自声明过） */
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}
</style>
