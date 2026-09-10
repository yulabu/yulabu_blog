<template>
  <SitePageFrame :show-typing="false" subtitle="友链">
    <main class="friends-layout">
      <ContentState v-if="loading" kind="loading" size="page">
        加载中...
      </ContentState>
      <ContentState v-else-if="links.length === 0" kind="empty" size="page">
        暂无友链
      </ContentState>

      <div v-else class="friends-grid">
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
            <div v-else class="preview-fallback">{{ link.name.charAt(0) }}</div>
          </div>

          <img
            v-if="link.avatar && !failedAvatars.has(link.avatar)"
            :src="link.avatar"
            class="card-avatar"
            loading="lazy"
            @error="failedAvatars.add(link.avatar)"
          />

          <div class="card-info">
            <h3 class="card-name">{{ link.name }}</h3>
            <p class="card-desc">{{ link.description || '这个站点还没有简介' }}</p>
          </div>
        </GlassPanel>
      </div>
    </main>
  </SitePageFrame>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getFriendLinks } from '@/api/friend'
import { useMessageBox } from '@/composables/useMessageBox'
import { createSilentSync } from '@/utils/liveData'
import ContentState from '@/components/common/ContentState.vue'
import GlassPanel from '@/components/common/GlassPanel.vue'
import SitePageFrame from '@/components/common/SitePageFrame.vue'

const props = defineProps({
  // 构建期烘焙的友链列表（friends.astro 注入），页面必定传入（取数失败传空数组）。
  // 不写 default：Astro 对 JS SFC 的函数式 default 会破坏 .vue 的类型生成
  initialLinks: { type: Array }
})

const { toast } = useMessageBox()
// 有烘焙数据就直接渲染 → 预渲染 HTML 里就有内容，首屏不闪「加载中」
const links = ref(props.initialLinks || [])
const loading = ref(!links.value.length)
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
  try {
    links.value = await getFriendLinks()
  } catch (e) {
    toast('获取友链失败', 'error')
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
.friends-layout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px var(--page-padding) 60px;
}

.friends-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

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

.preview-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  font-weight: 700;
  color: rgba(var(--color-primary-rgb), 0.4);
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

.card-info {
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-name {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
}

.card-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
