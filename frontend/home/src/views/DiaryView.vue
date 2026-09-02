<template>
  <SitePageFrame :show-typing="false" subtitle="日记">
    <main class="diary-layout">
      <ContentState v-if="loading" kind="loading" size="page">
        加载中...
      </ContentState>
      <ContentState v-else-if="diaries.length === 0" kind="empty" size="page">
        暂无日记
      </ContentState>

      <template v-else>
        <!-- 汇总卡 -->
        <GlassPanel class="summary-card">
          <div class="summary-left">
            <h2 class="summary-title">日记</h2>
            <p class="summary-subtitle">随时随地，分享生活</p>
          </div>
          <div class="summary-right">
            <span class="summary-count">{{ total }}</span>
            <span class="summary-label">条日记</span>
          </div>
        </GlassPanel>

        <!-- 日记卡片流 -->
        <div class="diary-list">
          <GlassPanel v-for="diary in diaries" :key="diary.id" class="diary-card">
            <h3 class="diary-title">{{ diaryTitle(diary) }}</h3>

            <p v-if="diaryBody(diary)" class="diary-content">{{ diaryBody(diary) }}</p>

            <div v-if="diary.images && diary.images.length" class="diary-gallery">
              <div
                v-for="(img, idx) in diary.images"
                :key="idx"
                class="diary-photo"
                @click="openLightbox(diary.images, idx)"
              >
                <img :src="img" class="diary-photo-img" :alt="'日记图片 ' + (idx + 1)" loading="lazy" />
              </div>
            </div>

            <div class="diary-footer">
              <span class="diary-time">
                <Icon icon="material-symbols:schedule-outline" class="time-icon" />
                {{ formatRelativeTime(diary.created_at) }}
              </span>
            </div>
          </GlassPanel>
        </div>
      </template>

      <Pagination v-if="!loading && totalPages > 1" v-model:page="page" :totalPages="totalPages" />
    </main>

    <Teleport to="body">
      <Transition name="lightbox">
        <div v-if="lightboxVisible" class="lightbox-overlay" @click="closeLightbox">
          <img :src="lightboxImages[lightboxIndex]" class="lightbox-img" alt="预览图片" @click.stop />
          <button class="lightbox-close" @click="closeLightbox" aria-label="关闭">✕</button>
          <button
            v-if="lightboxImages.length > 1"
            class="lightbox-nav lightbox-prev"
            @click.stop="prevImage"
            aria-label="上一张"
          >‹</button>
          <button
            v-if="lightboxImages.length > 1"
            class="lightbox-nav lightbox-next"
            @click.stop="nextImage"
            aria-label="下一张"
          >›</button>
          <span class="lightbox-counter">{{ lightboxIndex + 1 }} / {{ lightboxImages.length }}</span>
        </div>
      </Transition>
    </Teleport>
  </SitePageFrame>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { getPublicDiaries } from '@/api/diary'
import SitePageFrame from '@/components/common/SitePageFrame.vue'
import GlassPanel from '@/components/common/GlassPanel.vue'
import ContentState from '@/components/common/ContentState.vue'
import Pagination from '@/components/common/Pagination.vue'

const diaries = ref([])
const loading = ref(false)
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)

const lightboxVisible = ref(false)
const lightboxImages = ref([])
const lightboxIndex = ref(0)

function diaryTitle(diary) {
  const firstLine = diary.content.split('\n')[0].trim()
  return firstLine.slice(0, 40)
}

function diaryBody(diary) {
  const lines = diary.content.split('\n')
  const rest = lines.slice(1).join('\n').trim()
  if (rest) return rest
  return ''
}

function formatRelativeTime(createdAt) {
  const diff = Date.now() - new Date(createdAt).getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day

  if (diff < minute) return '刚刚'
  if (diff < hour) return Math.floor(diff / minute) + ' 分钟前'
  if (diff < day) return Math.floor(diff / hour) + ' 小时前'
  if (diff < month) return Math.floor(diff / day) + ' 天前'
  if (diff < 12 * month) return Math.floor(diff / month) + ' 个月前'
  return new Date(createdAt).getFullYear() + ' 年前'
}

function openLightbox(images, index) {
  lightboxImages.value = images
  lightboxIndex.value = index
  lightboxVisible.value = true
}

function closeLightbox() {
  lightboxVisible.value = false
}

function prevImage() {
  lightboxIndex.value = (lightboxIndex.value - 1 + lightboxImages.value.length) % lightboxImages.value.length
}

function nextImage() {
  lightboxIndex.value = (lightboxIndex.value + 1) % lightboxImages.value.length
}

async function fetchDiaries() {
  loading.value = true
  try {
    const res = await getPublicDiaries(page.value)
    diaries.value = res.diaries
    totalPages.value = res.totalPages
    total.value = res.total
  } catch (e) {
    console.error('获取日记失败:', e)
  } finally {
    loading.value = false
  }
}

fetchDiaries()

watch(page, () => {
  fetchDiaries()
  window.scrollTo({ top: 0, behavior: 'smooth' })
})
</script>

<style scoped>
.diary-layout {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 20px var(--page-padding) 60px;
}

/* 汇总卡 */
.summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px;
  margin-bottom: 24px;
  border-radius: 18px;
  border: 1px solid rgba(var(--color-primary-rgb, 99, 149, 86), 0.18);
  background: linear-gradient(145deg, rgba(var(--color-primary-rgb, 99, 149, 86), 0.08), var(--bg-card-strong));
}

.summary-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-title {
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 26px;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0;
  letter-spacing: .04em;
}

.summary-subtitle {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}

.summary-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-count {
  font-family: Georgia, serif;
  font-size: 34px;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.summary-label {
  font-size: 13px;
  color: var(--color-muted);
}

/* 日记卡片流 */
.diary-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.diary-card {
  padding: 24px 26px;
  border-radius: 18px;
  border: 1px solid var(--border-light);
  background: linear-gradient(145deg, var(--bg-card-strong), var(--bg-card));
  backdrop-filter: blur(18px);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.diary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px var(--shadow-color);
}

.diary-title {
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 10px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.diary-content {
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.8;
  margin: 0 0 14px;
  white-space: pre-wrap;
  word-break: break-word;
  opacity: 0.85;
}

/* 相册：完整展示图片 */
.diary-gallery {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.diary-photo {
  border-radius: 12px;
  overflow: hidden;
  cursor: zoom-in;
  border: 1px solid var(--border-light);
}

.diary-photo-img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.diary-photo:hover .diary-photo-img {
  transform: scale(1.01);
}

/* 底部 */
.diary-footer {
  display: flex;
  align-items: center;
  border-top: 1px solid var(--border-divider, rgba(0, 0, 0, 0.06));
  padding-top: 10px;
}

.diary-time {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--color-muted);
}

.time-icon {
  font-size: 14px;
}

/* 灯箱 */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(6px);
  cursor: zoom-out;
}

.lightbox-img {
  max-width: 92vw;
  max-height: 88vh;
  border-radius: 8px;
  object-fit: contain;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 26px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.3);
}

.lightbox-prev {
  left: 20px;
}

.lightbox-next {
  right: 20px;
}

.lightbox-counter {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.25s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .diary-layout {
    padding: 16px var(--page-padding) 40px;
  }

  .summary-card {
    padding: 18px 20px;
  }

  .summary-title {
    font-size: 22px;
  }

  .summary-count {
    font-size: 28px;
  }

  .diary-card {
    padding: 18px 18px;
  }

  .lightbox-prev {
    left: 8px;
  }

  .lightbox-next {
    right: 8px;
  }
}
</style>
