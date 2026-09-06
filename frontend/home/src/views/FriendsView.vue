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
              v-if="link.avatar && !failedAvatars.has(link.avatar)"
              :src="link.avatar"
              :alt="link.name"
              class="preview-img"
              loading="lazy"
              @error="failedAvatars.add(link.avatar)"
            />
            <div v-else class="preview-fallback">{{ link.name.charAt(0) }}</div>
          </div>

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
import ContentState from '@/components/common/ContentState.vue'
import GlassPanel from '@/components/common/GlassPanel.vue'
import SitePageFrame from '@/components/common/SitePageFrame.vue'

const { toast } = useMessageBox()
const links = ref([])
const loading = ref(true)
// 外链头像加载失败的 URL（回落站名首字；友链头像一律外链，防盗链/死链不可避免）
const failedAvatars = ref(new Set())

onMounted(async () => {
  try {
    links.value = await getFriendLinks()
  } catch (e) {
    toast('获取友链失败', 'error')
  } finally {
    loading.value = false
  }
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
