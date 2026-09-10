<template>
  <Transition name="post-splash" @after-leave="onAfterLeave">
    <div v-if="visible" class="post-splash">
      <div class="post-splash__card">
        <div class="post-splash__cover">
          <template v-if="payload && payload.cover">
            <!-- 底层：同图模糊放大铺满，给竖版图做两侧延伸 -->
            <img class="post-splash__cover-bg" :src="payload.cover" alt="" aria-hidden="true" />
            <img class="post-splash__cover-main" :src="payload.cover" :alt="payload.title" />
          </template>
          <span v-else class="post-splash__cover-fallback">{{ fallbackChar }}</span>
        </div>
        <div class="post-splash__body">
          <h3 class="post-splash__title">{{ payload.title }}</h3>
          <p v-if="payload.summary" class="post-splash__summary">{{ payload.summary }}</p>
          <span class="post-splash__hint">正在打开文章…</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
// 文章过渡卡片：常驻遮罩岛（transition:persist 跨页存活）。
// 点击文章条目的瞬间由 markPostSplash 广播事件、本组件同步弹出（数据来自被点击
// 条目，零网络等待），文章 SSR 在卡片背后并行加载；点击起算满 SPLASH_DWELL_MS
// 且已完成换页才淡出——SSR 慢于 2s 就显示到加载完，SPLASH_MAX_MS 强制兜底。
// 直接访问/刷新/分享链接没有点击信号，卡片永不出现。
import { ref, computed, onMounted, onUnmounted } from 'vue'

const SPLASH_DWELL_MS = 2000
const SPLASH_MAX_MS = 6000

const visible = ref(false)
const payload = ref(null)

const fallbackChar = computed(() => ((payload.value && payload.value.title) || '文').charAt(0) || '文')

let hideTimer = null
let maxTimer = null

function clearTimers() {
  clearTimeout(hideTimer)
  clearTimeout(maxTimer)
  hideTimer = null
  maxTimer = null
}

function show(data) {
  payload.value = data
  visible.value = true
  clearTimers()
  maxTimer = setTimeout(hide, SPLASH_MAX_MS)
}

function scheduleHide() {
  const elapsed = Date.now() - payload.value.t0
  clearTimeout(hideTimer)
  hideTimer = setTimeout(hide, Math.max(0, SPLASH_DWELL_MS - elapsed))
}

function hide() {
  clearTimers()
  visible.value = false
}

function onAfterLeave() {
  payload.value = null
}

function onSplashEvent(e) {
  show(e.detail)
}

function onAfterSwap() {
  if (!payload.value) return
  // 换页结果与被点击文章一致 → 补足停留时长后淡出；中途改点别的页 → 立即隐藏
  if (location.pathname === `/post/${payload.value.id}`) {
    scheduleHide()
  } else {
    hide()
  }
}

onMounted(() => {
  window.addEventListener('yulabu:post-splash', onSplashEvent)
  document.addEventListener('astro:after-swap', onAfterSwap)
})

onUnmounted(() => {
  window.removeEventListener('yulabu:post-splash', onSplashEvent)
  document.removeEventListener('astro:after-swap', onAfterSwap)
})
</script>

<style scoped>
.post-splash {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: var(--overlay-bg);
  backdrop-filter: blur(10px);
}

.post-splash-enter-active,
.post-splash-leave-active {
  transition: opacity 0.4s ease;
}

.post-splash-enter-active .post-splash__card,
.post-splash-leave-active .post-splash__card {
  transition: transform 0.4s ease;
}

.post-splash-enter-from,
.post-splash-leave-to {
  opacity: 0;
}

.post-splash-enter-from .post-splash__card {
  transform: translateY(20px);
}

.post-splash-leave-to .post-splash__card {
  transform: translateY(-14px);
}

.post-splash__card {
  width: min(840px, 100%);
  border-radius: 28px;
  overflow: hidden;
  border-top: 1px solid var(--border-light);
  border-left: 1px solid var(--border-light);
  background: linear-gradient(to right bottom, var(--bg-glass-start), var(--bg-glass-mid), var(--bg-glass-end));
  backdrop-filter: blur(18px);
  box-shadow: 0 28px 64px var(--shadow-color);
}

.post-splash__cover {
  position: relative;
  width: 100%;
  /* 固定高度：img 用 contain + 模糊铺底适配任意宽高比（竖版图完整显示不裁切） */
  height: clamp(280px, 56.25vw, 472px);
  max-height: 52vh;
  overflow: hidden;
  background: rgba(var(--color-primary-rgb), 0.1);
}

.post-splash__cover-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(20px) saturate(1.15);
  transform: scale(1.12);
  opacity: 0.85;
}

.post-splash__cover-main {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.post-splash__cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-family: 'LXGW WenKai', 'Microsoft YaHei', sans-serif;
  font-size: 96px;
  font-weight: 700;
  color: rgba(var(--color-primary-rgb), 0.4);
}

.post-splash__body {
  padding: 32px 40px 36px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.post-splash__title {
  margin: 0;
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 30px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--color-heading);
}

.post-splash__summary {
  margin: 0;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 18px;
  line-height: 1.6;
  color: var(--color-text);
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.post-splash__hint {
  font-size: 14px;
  color: var(--color-muted);
}
</style>
