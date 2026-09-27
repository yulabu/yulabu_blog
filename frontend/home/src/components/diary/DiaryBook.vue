<template>
  <button
    ref="rootEl"
    class="book"
    :class="[`book--tone-${tone}`, cover ? 'book--photo' : 'book--plain']"
    type="button"
    :aria-label="`${dateLabel} ${title}`"
    :style="{ '--book-scale': heightScale }"
    @click="handleClick"
  >
    <!-- 书脊条：封面被挤成一条，立在层板上 -->
    <span ref="spineEl" class="book__spine">
      <img v-if="cover" class="book__img" :src="cover" alt="" loading="lazy" decoding="async" />
      <span class="book__shade" aria-hidden="true"></span>
      <span class="book__ridge" aria-hidden="true"></span>
      <span class="book__title">{{ spineTitle }}</span>
      <span class="book__band">
        <span class="book__year">{{ yearLabel }}</span>
      </span>
    </span>

    <!-- 两道影子是"书插在架子里"的全部依据：右侧落在背板上、下方落在层板上。
         抽出时它们一起松开，书才真的像离开了那个位置 -->
    <span class="book__cast" aria-hidden="true"></span>
    <span class="book__contact" aria-hidden="true"></span>

    <!-- 抽出的完整封面：绝对定位的 3D 平面，不影响布局，邻书不动 -->
    <span class="book__cover" aria-hidden="true">
      <img v-if="cover" class="book__cover-img" :src="cover" alt="" loading="lazy" decoding="async" />
      <span v-else class="book__cover-plain"></span>
      <span class="book__meta">
        <span class="book__meta-date">{{ dateLabel }}</span>
        <span class="book__meta-title">{{ title }}</span>
        <span v-if="excerpt" class="book__meta-excerpt">{{ excerpt }}</span>
      </span>
    </span>
  </button>
</template>

<script setup>
import { computed, ref } from 'vue'
import { formatDateDot } from '@/utils/date'
import {
  diaryCover,
  diaryExcerpt,
  diaryHeightScale,
  diaryTitle,
  diaryTone,
  truncateText
} from '@/utils/diary'

const props = defineProps({
  diary: { type: Object, required: true }
})

const emit = defineEmits(['open'])

const rootEl = ref(null)
const spineEl = ref(null)

const title = computed(() => diaryTitle(props.diary))
const excerpt = computed(() => diaryExcerpt(props.diary))
const cover = computed(() => diaryCover(props.diary))
const dateLabel = computed(() => formatDateDot(props.diary.created_at))
const yearLabel = computed(() => String(props.diary.created_at || '').slice(0, 4))
// 竖排书脊放不下时确定性截断（不用 CSS 省略号：竖排下的行内截断各家实现不一）
const spineTitle = computed(() => truncateText(title.value, 18))
const tone = computed(() => diaryTone(props.diary.id))
// 高矮不齐才像真书架（书脊底部仍然对齐在同一块层板上）
const heightScale = computed(() => diaryHeightScale(props.diary.id))

function handleClick() {
  emit('open', {
    // 用书脊条的矩形而不是整个书位：飞行入场要从"书真正在屏幕上的样子"起飞
    rect: spineEl.value ? spineEl.value.getBoundingClientRect() : null,
    el: rootEl.value
  })
}
</script>

<style scoped>
.book {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: calc(var(--book-h) * var(--book-scale, 1));
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  /* 透视放在每本书自己身上：抽书是绕自己转的，透视原点跟着书走，
     同一层里任意位置的书观感一致 */
  perspective: 900px;
}

/* 书脊条 */
.book__spine {
  position: absolute;
  inset: 0 4%;
  display: flex;
  justify-content: center;
  overflow: hidden;
  border-radius: 3px 4px 4px 3px;
  background:
    repeating-linear-gradient(180deg, rgba(0, 0, 0, 0.035) 0 1px, transparent 1px 4px),
    linear-gradient(100deg, var(--book-paper-2), var(--book-paper));
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.07);
  transform: translateY(0) translateZ(0);
  transition:
    transform 0.42s cubic-bezier(0.2, 0.7, 0.2, 1),
    box-shadow 0.42s cubic-bezier(0.2, 0.7, 0.2, 1);
}

/* 脊线 + 上下断面：让一条平面读出「这是一本书的侧面」 */
.book__ridge {
  position: absolute;
  inset: 0;
  z-index: 3;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
    inset 1px 0 0 rgba(255, 255, 255, 0.24),
    inset -3px 0 5px -2px rgba(0, 0, 0, 0.34),
    inset 0 7px 7px -7px rgba(0, 0, 0, 0.42),
    inset 0 -7px 7px -7px rgba(0, 0, 0, 0.42);
}

.book__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* 裁切而不是拉伸：日记图片比例不可控，横图上架被压 4 倍会明显畸变。
     想要更强的「压扁」观感，把下面这行换成 object-fit: fill 即可 */
  object-fit: cover;
  object-position: center;
}

/* 封面有图时压一层暗纱：保证竖排书名与年份在任何照片上都够对比度 */
.book__shade {
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.46) 0%,
    rgba(0, 0, 0, 0.06) 34%,
    rgba(0, 0, 0, 0.1) 62%,
    rgba(0, 0, 0, 0.6) 100%
  );
}

.book--photo .book__shade {
  opacity: 1;
}

.book__title {
  /* 竖排：短标题一列居中，长标题自动折成多列（真实书脊就是这么排的） */
  position: relative;
  z-index: 4;
  writing-mode: vertical-rl;
  align-self: flex-start;
  max-height: calc(100% - 48px);
  max-width: calc(100% - 12px);
  margin-top: 11px;
  overflow: hidden;
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: clamp(11px, 1.1vw + 7px, 13.5px);
  font-weight: 600;
  line-height: 1.18;
  letter-spacing: 0.06em;
  color: var(--color-heading);
  text-align: center;
}

.book--photo .book__title {
  color: var(--book-title);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
}

/* 书脊底部的年份色带 */
.book__band {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  background: var(--book-tone);
  writing-mode: horizontal-tb;
}

/* 有封面图时年份带改压一层暗色：照片上的站点色带对比度不可控 */
.book--photo .book__band {
  background: rgba(12, 16, 14, 0.68);
}

.book__year {
  font-family: Georgia, serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #fff;
}

.book--plain .book__year {
  color: rgba(255, 255, 255, 0.94);
}

/* 落在背板上的那道影：光从左上来，影向右撇 */
.book__cast {
  position: absolute;
  top: 2%;
  bottom: 1%;
  left: 96%;
  width: 15px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.42), transparent);
  filter: blur(2px);
  opacity: 0.5;
  transition:
    transform 0.42s cubic-bezier(0.2, 0.7, 0.2, 1),
    opacity 0.42s ease;
}

/* 落在层板上的接触影 */
.book__contact {
  position: absolute;
  right: 2%;
  bottom: -2px;
  left: 2%;
  height: 7px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  filter: blur(3px);
  opacity: 0.55;
  transition:
    transform 0.42s cubic-bezier(0.2, 0.7, 0.2, 1),
    opacity 0.42s ease;
}

/* 抽出的完整封面：枢轴固定在书脊的右缘（全站统一，不做左右镜像——
   按左右半边分别向两侧展开会让鼠标扫过书架时卡片来回跳，实测很怪） */
.book__cover {
  position: absolute;
  top: 50%;
  left: 96%;
  width: clamp(176px, 32vw + 56px, 302px);
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: 5px;
  background: var(--book-paper);
  box-shadow:
    0 22px 40px -14px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(0, 0, 0, 0.14);
  opacity: 0;
  pointer-events: none;
  transform-origin: left center;
  transform: translateY(-50%) rotateY(-90deg);
  transition:
    transform 0.48s cubic-bezier(0.2, 0.7, 0.2, 1),
    opacity 0.24s ease;
}

.book__cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 无封面图时的抽出版：布面书壳 + 盲压框，而不是一块纯色板 */
.book__cover-plain {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(58deg, rgba(255, 255, 255, 0.05) 0 2px, transparent 2px 5px),
    repeating-linear-gradient(-58deg, rgba(0, 0, 0, 0.045) 0 2px, transparent 2px 5px),
    linear-gradient(158deg, var(--book-tone), var(--book-paper-2) 132%);
}

.book__cover-plain::after {
  content: '';
  position: absolute;
  inset: 12px 14px 30%;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: inset 0 0 0 4px rgba(0, 0, 0, 0.07);
}

/* 封面卡底部的信息带（日期 + 主题 + 摘要） */
.book__meta {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 26px 13px 12px;
  color: var(--book-title);
  text-align: left;
  background: linear-gradient(transparent, rgba(8, 12, 10, 0.72) 42%, rgba(8, 12, 10, 0.88));
}

.book__meta-date {
  font-family: Georgia, serif;
  font-size: 12px;
  letter-spacing: 0.05em;
  opacity: 0.9;
}

.book__meta-title {
  display: -webkit-box;
  overflow: hidden;
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.book__meta-excerpt {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.55;
  opacity: 0.78;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/* —— 抽出 ——
   三段同时起步、速度略有前后：书先离开层板并向前出架（translateZ 在 900 透视下
   约放大 10%，能看出「出来了」），随后封面绕书脊右缘转正。
   只给真正有悬停能力的设备开：触屏 hover:none 时单击直接开日记本 */
@media (hover: hover) {
  .book:hover,
  .book:focus-visible {
    z-index: 6;
  }

  .book:hover .book__spine,
  .book:focus-visible .book__spine {
    transform: translateY(-30px) translateZ(86px) rotateY(-7deg);
    box-shadow:
      inset 0 0 0 1px rgba(0, 0, 0, 0.07),
      0 26px 32px -16px rgba(0, 0, 0, 0.55);
  }

  /* 影子不跟着走：书离开后，背板上的影被拉长、层板上的影散开 */
  .book:hover .book__cast,
  .book:focus-visible .book__cast {
    opacity: 0.3;
    transform: translateY(-24px) scaleX(1.5);
    transform-origin: left center;
  }

  .book:hover .book__contact,
  .book:focus-visible .book__contact {
    opacity: 0.2;
    transform: scaleX(1.18);
  }

  .book:hover .book__cover,
  .book:focus-visible .book__cover {
    opacity: 1;
    transform: translateY(-50%) rotateY(-8deg);
    transition:
      transform 0.48s cubic-bezier(0.2, 0.7, 0.2, 1) 0.06s,
      opacity 0.24s ease 0.08s;
  }

  .book:active .book__spine {
    transform: translateY(-22px) translateZ(62px) rotateY(-7deg);
  }
}

/* 无书脊图：纸色 + 站点色系色带，整本书一个图片请求都不发 */
.book--tone-0 {
  --book-tone: var(--color-primary);
}

.book--tone-1 {
  --book-tone: var(--color-accent);
}

.book--tone-2 {
  --book-tone: var(--color-sakura-deep);
}

.book--tone-3 {
  --book-tone: var(--color-muted);
}

/* 降低动态效果：不抽书、不转动，只做透明度切换 */
@media (prefers-reduced-motion: reduce) {
  .book__spine,
  .book__cast,
  .book__contact,
  .book__cover {
    transition: opacity 0.2s ease;
  }

  .book__cover {
    transform: translateY(-50%);
  }

  .book:hover .book__spine,
  .book:focus-visible .book__spine,
  .book:active .book__spine {
    transform: none;
  }

  .book:hover .book__cast,
  .book:focus-visible .book__cast,
  .book:hover .book__contact,
  .book:focus-visible .book__contact {
    transform: none;
  }

  .book:hover .book__cover,
  .book:focus-visible .book__cover {
    transform: translateY(-50%);
  }
}
</style>
