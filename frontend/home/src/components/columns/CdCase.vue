<template>
  <!-- ghost：行尾补位格，只渲染「隐形占位 + 续木段」，把架子拼成整条 -->
  <span v-if="ghost" class="cd-item cd-item--ghost" aria-hidden="true">
    <span class="cd-stage"></span>
    <span class="cd-label"></span>
  </span>

  <a
    v-else
    class="cd-item"
    :href="`/columns/${column.id}`"
    :aria-label="`${column.name}，${column.post_count} 篇文章`"
    @click="onPick"
  >
    <span class="cd-stage">
      <!-- z:1 光碟：藏在塑料盒后层，从右缘露出约三成碟径 -->
      <span ref="discRef" class="cd-disc" aria-hidden="true">
        <CdDiscFace :cover="column.cover" :char="char" alt="" />
      </span>
      <!-- z:2 透明塑料盒：方形封面内嵌，右缘半透明压住碟片 -->
      <span class="cd-case">
        <span class="cd-case__art-frame" :class="{ 'cd-case__art-frame--paper': !column.cover }">
          <img
            v-if="column.cover"
            class="cd-case__art"
            :src="column.cover"
            :alt="column.name"
            loading="lazy"
          />
          <CoverFallback v-else class="cd-case__fallback" variant="tinted" :text="char" />
        </span>
        <span class="cd-case__plastic" aria-hidden="true"></span>
      </span>
      <span class="cd-grounds" aria-hidden="true"></span>
    </span>
    <!-- 铭牌：坐在木架板条上（相邻格子的板条无缝拼成整条架） -->
    <span class="cd-label">
      <span class="cd-label__name">{{ column.name }}</span>
      <span class="cd-label__count">
        <i class="cd-label__num">{{ column.post_count }}</i> 篇
      </span>
    </span>
  </a>
</template>

<script setup>
import { computed, ref } from 'vue'
import CdDiscFace from '@/components/columns/CdDiscFace.vue'
import CoverFallback from '@/components/ui/CoverFallback.vue'
import { markColumnSplash } from '@/utils/columnSplash'

const props = defineProps({
  // 列表烘焙注入的专栏条目（api/column.ts 的 ColumnItem）；ghost 补位格不传
  column: { type: Object, default: null },
  ghost: { type: Boolean, default: false }
})

const char = computed(() => (props.column?.name || '栏').charAt(0))

// 点击不 preventDefault：<a> 默认行为走 ClientRouter 软导航，飞行碟由常驻岛
// ColumnCdSplash 接管（信号只记起点与数据，导航本身照常发生）
const discRef = ref(null)

function onPick() {
  markColumnSplash(props.column, discRef.value)
}
</script>

<style scoped>
/* ---- 几何（全部百分比以格子宽为基准，四个量互相咬合）----
 * case  占 7% → 77%；碟径 0.95 × 70% = 66.5%，左缘 29% → 露出 77% 右侧约 28% 碟径；
 * 下一格的盒从 107% 起，与露出的碟缘保持约一个格宽 11% 的呼吸空隙 */
.cd-item {
  --case-w: 70%;
  --case-offset: 7%;
  --disc-left: 29%;
  --disc-scale: 0.95;
  --disc-peek: 16%;
  display: block;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

.cd-item--ghost {
  pointer-events: none;
}

/* ghost 的占位：与真实 stage 同构（同一组几何变量派生），保证续木段落在同一水平线 */
.cd-item--ghost .cd-stage::before {
  content: '';
  display: block;
  width: var(--case-w);
  margin-left: var(--case-offset);
  aspect-ratio: 1 / 1.04;
}

.cd-stage {
  position: relative;
  display: block;
}

/* ---- 光碟 ---- */
.cd-disc {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: var(--disc-left);
  width: calc(var(--case-w) * var(--disc-scale));
  aspect-ratio: 1;
  /* 垂直居中走 translate 的 y 分量；hover 抽碟只改 x 分量与 rotate，互不覆盖 */
  translate: 0 -50%;
  rotate: 0deg;
  filter: drop-shadow(0 5px 6px rgba(60, 80, 65, 0.28));
  transition:
    translate 0.7s var(--ease-standard),
    rotate 0.7s var(--ease-standard),
    filter 0.7s var(--ease-standard);
}

.cd-item:hover .cd-disc,
.cd-item:focus-visible .cd-disc {
  translate: var(--disc-peek) -50%;
  rotate: 7deg;
  filter: drop-shadow(0 11px 13px rgba(60, 80, 65, 0.32));
}

.cd-item:hover .cd-disc,
.cd-item:focus-visible .cd-disc {
  --disc-sheen: 0.85;
}

/* ---- 透明塑料盒 ---- */
.cd-case {
  position: relative;
  z-index: 2;
  display: block;
  width: var(--case-w);
  margin-left: var(--case-offset);
  aspect-ratio: 1 / 1.04;
  border-radius: 7px;
  background: linear-gradient(
    118deg,
    var(--cd-plastic-strong),
    var(--cd-plastic) 36%,
    var(--cd-plastic) 72%,
    var(--cd-plastic-strong)
  );
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.55),
    inset 0 1px 1px rgba(255, 255, 255, 0.7),
    inset -2px -3px 6px var(--cd-plastic-shade),
    0 3px 6px rgba(60, 80, 65, 0.14),
    0 18px 26px -10px var(--shadow-color);
  transition: box-shadow 0.7s var(--ease-standard);
}

/* 封面内嵌框：右侧与上下的塑料留边薄（碟缘从右边透出），左侧留出书脊。
   img 是替换元素，inset + width:auto 只会按固有尺寸渲染（会整页溢出），
   必须由框定尺寸、图填满框 */
.cd-case__art-frame {
  position: absolute;
  inset: 4.5% 5% 4.5% 11%;
  border-radius: 3px;
  overflow: hidden;
  /* 插纸不透明：兜底态下把身后的光碟挡住，只留右缘该露的那截 */
  background: linear-gradient(150deg, var(--cd-case-paper), var(--cd-case-paper-deep));
}

.cd-case__art-frame--paper {
  box-shadow: inset 0 0 0 1px rgba(var(--color-primary-rgb), 0.12);
}

.cd-case__art {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cd-case__fallback {
  width: 100%;
  height: 100%;
  background: none;
}

/* 塑料面高光：一道静态斜扫光 + 顶缘受光 + 底缘沉影 */
.cd-case__plastic {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    linear-gradient(112deg, transparent 40%, rgba(255, 255, 255, 0.3) 49%, transparent 60%),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.35), transparent 14%),
    linear-gradient(to top, var(--cd-plastic-shade), transparent 12%);
}

/* 左脊：实体盒的折边，竖向亮带 */
.cd-case__plastic::before {
  content: '';
  position: absolute;
  top: 2%;
  bottom: 2%;
  left: 2.5%;
  width: 6.5%;
  border-radius: 4px;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.65),
    rgba(255, 255, 255, 0.18) 30%,
    rgba(255, 255, 255, 0.42) 70%,
    rgba(255, 255, 255, 0.6)
  );
  box-shadow: inset 0 0 2px rgba(255, 255, 255, 0.8);
}

/* 盒底落在架板上的椭圆软影 */
.cd-grounds {
  position: absolute;
  z-index: 0;
  left: 5%;
  right: 24%;
  bottom: -4px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(60, 75, 60, 0.2), transparent 72%);
  filter: blur(2px);
}

/* ---- 木质铭牌（架板条）：相邻格子无缝拼接 ---- */
.cd-label {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 42px;
  margin-top: 5px;
  padding: 0 14px;
  font-family: var(--font-kai);
  background:
    linear-gradient(to bottom, var(--cd-wood-light), transparent 34%),
    /* 两组不同周期的木纹细线叠加，打散机械条纹感 */
    repeating-linear-gradient(
      91deg,
      transparent 0 13px,
      var(--cd-wood-grain) 13px 14px,
      transparent 14px 27px
    ),
    repeating-linear-gradient(
      89.2deg,
      transparent 0 7px,
      var(--cd-wood-grain) 7px 7.5px,
      transparent 7.5px 31px
    ),
    linear-gradient(var(--shelf-ledge), var(--shelf-ledge));
  box-shadow:
    inset 0 1px 0 var(--cd-wood-light),
    inset 0 -2px 3px var(--cd-wood-shade),
    0 9px 12px -7px var(--shadow-color);
}

.cd-item:first-child .cd-label {
  border-radius: 6px 0 0 6px;
}

.cd-item:last-child .cd-label {
  border-radius: 0 6px 6px 0;
}

.cd-label__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-heading);
  transition: color 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cd-label__count {
  flex-shrink: 0;
  margin-left: 10px;
  font-size: 12px;
  color: var(--color-text);
}

/* 数字用 Cormorant Garamond Italic（页面级引入），与页头 My Columns 同一款衬线 */
.cd-label__num {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 600;
  font-size: 15px;
  padding-right: 1px;
}

.cd-item:focus-visible .cd-case {
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.55),
    inset 0 1px 1px rgba(255, 255, 255, 0.7),
    inset -2px -3px 6px var(--cd-plastic-shade),
    0 0 0 2px rgba(var(--color-primary-rgb), 0.55),
    0 18px 26px -10px var(--shadow-color);
}
</style>
