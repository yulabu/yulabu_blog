<template>
  <!--
    日记照片墙：展签 + CSS 多列瀑布流。
    不按视口算列数、不做 JS 高度测量：column-width 自动得到 1/2/3 列，
    预渲染 HTML 首帧就是最终排版，零 CLS。
    职责只有「墙与展签」；一件陈列的视觉/点击测量在 DiaryPrint。
  -->
  <section class="diary-gallery" :aria-label="`日记照片墙，共 ${total} 篇`">
    <header class="diary-gallery__label">
      <span class="diary-gallery__kicker">DIARY WALL</span>
      <span class="diary-gallery__rule" aria-hidden="true"></span>
      <span class="diary-gallery__count">共 {{ total }} 篇</span>
    </header>

    <ul class="diary-gallery__wall">
      <li
        v-for="(diary, index) in diaries"
        :key="diary.id"
        class="diary-gallery__item"
        :class="{ 'is-active': index === activeIndex }"
      >
        <DiaryPrint :diary="diary" :index="index" @open="onOpen(index, $event)" />
      </li>
    </ul>

    <slot />
  </section>
</template>

<script setup>
import DiaryPrint from '@/components/diary/DiaryPrint.vue'

defineProps({
  diaries: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  /** 正在读的那张：本子打开时把墙上的原件藏起来，避免与飞行冲印重影 */
  activeIndex: { type: Number, default: -1 }
})

const emit = defineEmits(['open'])

// 行内序号就是当前页数组的下标：画廊不再有书架的 12 列换算
function onOpen(index, payload) {
  emit('open', { ...payload, index })
}
</script>

<style scoped>
.diary-gallery {
  position: relative;
  isolation: isolate;
  width: 100%;
}

/* 墙面：两束极淡的顶光 + 一层几乎看不见的纤维纹理；不使用图片 */
.diary-gallery::before {
  content: '';
  position: absolute;
  inset: -14px -20px 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(58% 38% at 24% 0%, var(--gallery-wall-light) 0%, transparent 72%),
    radial-gradient(46% 30% at 82% 4%, var(--gallery-wall-light-2) 0%, transparent 74%),
    repeating-linear-gradient(0deg, var(--gallery-wall-fiber) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(90deg, var(--gallery-wall-fiber) 0 1px, transparent 1px 4px);
}

.diary-gallery__label {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  font-family: var(--font-ui);
}

.diary-gallery__kicker {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.22em;
  color: var(--color-heading);
  white-space: nowrap;
}

.diary-gallery__rule {
  flex: 1;
  height: 1px;
  background: var(--border-divider);
  opacity: 0.8;
}

.diary-gallery__count {
  font-size: 11.5px;
  letter-spacing: 0.06em;
  color: var(--color-muted);
  white-space: nowrap;
}

.diary-gallery__wall {
  position: relative;
  z-index: 1;
  list-style: none;
  margin: 0;
  /* 顶部给第一排的胶带留出越界空间 */
  padding: 10px 0 0;
  columns: 280px;
  column-gap: 24px;
}

.diary-gallery__item {
  break-inside: avoid;
  margin: 0 0 26px;
  transition: opacity 0.2s ease;
}

/* 本子打开时藏起被点的那一张；关闭后淡回来（本子遮罩之下，观感是干净的交接） */
.diary-gallery__item.is-active {
  opacity: 0;
}
</style>
