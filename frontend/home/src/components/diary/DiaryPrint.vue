<template>
  <!--
    照片墙上的一件陈列：有图是白边冲印 + 胶带 + 批注；无图是点阵纸笺。
    职责只有「一件的视觉 + 点击测量」；布局（多列墙）在 DiaryGallery，
    打开后的本子在 DiaryNotebook。
    比例/倾斜/胶带位置都由 id 确定性派生（utils/diary），构建期与客户端一致。
  -->
  <button
    ref="rootEl"
    class="diary-print"
    :class="{ 'diary-print--photo': !!cover, 'diary-print--note': !cover }"
    :style="{ '--tilt': `${tilt}deg` }"
    type="button"
    :aria-label="ariaLabel"
    @click="handleClick"
  >
    <!-- 胶带：只贴一部分，位置/角度确定；压在纸面上方，不参与按钮语义 -->
    <span
      v-if="tape"
      class="diary-print__tape"
      :class="[`diary-print__tape--${quarter}`, tape.side === 'left' ? 'is-left' : 'is-right']"
      :style="{ '--tape-angle': `${tape.angle}deg` }"
      aria-hidden="true"
    ></span>

    <template v-if="cover">
      <span ref="photoEl" class="diary-print__photo" :style="photoStyle">
        <img
          class="diary-print__img"
          :src="cover"
          :alt="title"
          :loading="index === 0 ? 'eager' : 'lazy'"
          :fetchpriority="index === 0 ? 'high' : undefined"
          decoding="async"
        />
      </span>
      <span class="diary-print__caption">
        <span class="diary-print__date">{{ dateMD }}</span>
        <span class="diary-print__title">{{ title }}</span>
        <span v-if="excerpt" class="diary-print__excerpt">{{ excerpt }}</span>
        <span class="diary-print__hint" aria-hidden="true">
          翻开
          <AppIcon icon="material-symbols:arrow-forward-rounded" class="diary-print__hint-icon" />
        </span>
      </span>
    </template>

    <span v-else class="diary-print__note">
      <span class="diary-print__note-head">
        <span class="diary-print__date">{{ dateMD }}</span>
        <AppIcon icon="mdi:sprout" class="diary-print__sprout" />
      </span>
      <span class="diary-print__title">{{ title }}</span>
      <span v-if="excerpt" class="diary-print__excerpt">{{ excerpt }}</span>
      <span v-else class="diary-print__excerpt diary-print__excerpt--faint">这天只写了一句。</span>
      <span class="diary-print__hint" aria-hidden="true">
        翻开
        <AppIcon icon="material-symbols:arrow-forward-rounded" class="diary-print__hint-icon" />
      </span>
    </span>
  </button>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatDateLong, formatDateMD } from '@/utils/date'
import {
  diaryCardTilt,
  diaryCover,
  diaryExcerpt,
  diaryPrintRatio,
  diaryQuarter,
  diaryTape,
  diaryTitle
} from '@/utils/diary'

const props = defineProps({
  diary: { type: Object, required: true },
  /** 当前页内的展示序号：0 是第一张，负责 LCP 的 eager/high */
  index: { type: Number, default: 0 }
})

const emit = defineEmits(['open'])

const rootEl = ref(null)
const photoEl = ref(null)

const title = computed(() => diaryTitle(props.diary))
const cover = computed(() => diaryCover(props.diary))
const excerpt = computed(() => diaryExcerpt(props.diary, 80))
const dateMD = computed(() => formatDateMD(props.diary.created_at))
const ariaLabel = computed(() => `${formatDateLong(props.diary.created_at)}，${title.value}`)

// 优先用 API 给的原图宽高：照片卡按真实 cover 比例陈列，不裁切；
// 老图未回填时为 null，回退到 id 派生的确定性比例（避免 CLS / 水合差异）
const photoStyle = computed(() => {
  const w = Number(props.diary.coverWidth)
  const h = Number(props.diary.coverHeight)
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return { aspectRatio: `${w} / ${h}` }
  }
  const fallback = diaryPrintRatio(props.diary.id)
  return { aspectRatio: `${fallback.w} / ${fallback.h}` }
})

const tilt = computed(() => diaryCardTilt(props.diary.id))
const tape = computed(() => diaryTape(props.diary.id))
const quarter = computed(() => diaryQuarter(props.diary.created_at))

function handleClick() {
  // 飞行起点用照片本身（没有照片就用整张纸笺）；日记本再做一次书体比例校正
  const target = photoEl.value || rootEl.value
  emit('open', {
    rect: target ? target.getBoundingClientRect() : null,
    el: rootEl.value
  })
}
</script>

<style scoped>
.diary-print {
  position: relative;
  display: block;
  width: 100%;
  margin: 0;
  padding: 8px 8px 0;
  border: 0;
  border-radius: 3px;
  background: var(--gallery-print);
  color: var(--paper-ink);
  font: inherit;
  font-family: var(--font-ui);
  text-align: left;
  cursor: pointer;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  -webkit-tap-highlight-color: transparent;
  box-shadow: var(--gallery-print-shadow);
  transform: rotate(var(--tilt, 0deg));
  transition: transform 0.35s var(--ease-standard), box-shadow 0.35s ease;
}

.diary-print:hover,
.diary-print:focus-visible {
  transform: translateY(-4px) rotate(0deg);
  box-shadow: var(--gallery-print-shadow-hover);
}

.diary-print:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 4px;
}

.diary-print:active {
  transform: translateY(-2px) rotate(0deg) scale(0.995);
}

/* ---- 胶带 ---- */
.diary-print__tape {
  position: absolute;
  top: -8px;
  z-index: 2;
  width: 54px;
  height: 18px;
  border-radius: 1px;
  opacity: 0.85;
  pointer-events: none;
  transform: rotate(var(--tape-angle, 0deg));
  clip-path: polygon(2% 0, 100% 4%, 97% 100%, 0 95%);
  box-shadow: inset 0 1px 0 var(--border-light);
}

.diary-print__tape.is-left {
  left: 13%;
}

.diary-print__tape.is-right {
  right: 11%;
}

.diary-print__tape--0 {
  background: var(--gallery-tape-1);
}

.diary-print__tape--1 {
  background: var(--gallery-tape-2);
}

.diary-print__tape--2 {
  background: var(--gallery-tape-3);
}

.diary-print__tape--3 {
  background: var(--gallery-tape-4);
}

/* ---- 冲印 ---- */
.diary-print__photo {
  position: relative;
  display: block;
  width: 100%;
  overflow: hidden;
  border-radius: 1px;
  background: rgba(var(--color-primary-rgb), 0.08);
}

.diary-print__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.5s var(--ease-standard);
}

.diary-print:hover .diary-print__img,
.diary-print:focus-visible .diary-print__img {
  transform: scale(1.035);
}

/* ---- 批注 / 纸笺共用排版 ---- */
.diary-print__caption {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 4px 10px;
}

.diary-print__date {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 10.5px;
  line-height: 1.2;
  letter-spacing: 0.12em;
  color: var(--paper-muted);
  font-variant-numeric: tabular-nums;
}

.diary-print__title {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-family: var(--font-kai);
  font-size: 15.5px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--paper-ink);
  word-break: break-word;
}

.diary-print__excerpt {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 12px;
  line-height: 1.7;
  color: var(--paper-text);
  word-break: break-word;
}

.diary-print__excerpt--faint {
  opacity: 0.66;
}

.diary-print__hint {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  min-height: 14px;
  margin-top: 2px;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--paper-ink);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.diary-print:hover .diary-print__hint,
.diary-print:focus-visible .diary-print__hint {
  opacity: 1;
  transform: none;
}

.diary-print__hint-icon {
  font-size: 14px;
}

/* ---- 无图纸笺 ---- */
.diary-print--note {
  min-height: 178px;
  padding: 18px 18px 12px;
  background-color: var(--gallery-print);
  background-image: radial-gradient(var(--notebook-line) 1px, transparent 1.2px);
  background-size: 18px 18px;
}

.diary-print__note {
  display: flex;
  flex-direction: column;
  min-height: 148px;
}

.diary-print__note-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.diary-print__sprout {
  font-size: 15px;
  color: var(--paper-muted);
  opacity: 0.75;
}

.diary-print--note .diary-print__title {
  -webkit-line-clamp: 3;
  font-size: 16.5px;
  line-height: 1.5;
}

.diary-print--note .diary-print__excerpt {
  -webkit-line-clamp: 4;
  margin-top: 6px;
  font-size: 12.5px;
  line-height: 1.75;
}

.diary-print--note .diary-print__hint {
  margin-top: auto;
  padding-top: 12px;
}

@media (max-width: 480px) {
  .diary-print--note {
    min-height: 160px;
    padding: 16px 16px 10px;
  }

  .diary-print__note {
    min-height: 134px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .diary-print,
  .diary-print__img,
  .diary-print__hint {
    transition: none;
  }

  .diary-print:hover,
  .diary-print:focus-visible {
    transform: rotate(var(--tilt, 0deg));
  }

  .diary-print:hover .diary-print__img,
  .diary-print:focus-visible .diary-print__img {
    transform: none;
  }
}
</style>
