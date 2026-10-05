<template>
  <span class="cd-disc-face">
    <img
      v-if="cover"
      class="cd-disc-face__art"
      :src="cover"
      :alt="alt"
      loading="lazy"
    />
    <span v-else class="cd-disc-face__art cd-disc-face__art--fallback">
      <CoverFallback :text="char" />
    </span>
    <span class="cd-disc-face__film" aria-hidden="true"></span>
    <span class="cd-disc-face__sheen" aria-hidden="true"></span>
    <span class="cd-disc-face__hub" aria-hidden="true"></span>
  </span>
</template>

<script setup>
/**
 * CD 碟面材质（专栏架 CdCase 与转场岛 ColumnCdSplash 共用的唯一实现）。
 *
 * 从中心到边缘五层结构，全部 CSS、无图片素材：
 *   1. 根元素  —— 银色基底（radial-gradient 多段）+ mask 冲出中心透明孔
 *                 （孔里透出页面底色，与真实光碟一致）；孔径取碟半径 12%
 *                 （实物 15mm/120mm ≈ 12.5%）。
 *   2. art     —— 同一张 cover 裁圆满铺作碟面印刷，hub 负责把中心盖回银色。
 *   3. film    —— 彩虹镀膜：低饱和粉彩 conic-gradient + mix-blend-mode:screen，
 *                 在银底与印刷上做加色反光（发彩不发灰）。
 *   4. sheen   —— 斜向高光扫面 + 左上定点高光；透明度走 --disc-sheen
 *                 （默认 0.5），CdCase hover 时把变量提到 0.85 增强反光。
 *   5. hub     —— 中心总成：孔缘亮环 → 夹持透明环 → 镜面带（盖住印刷，
 *                 印刷从镜面带外缘才开始，与实碟一致）→ 渐隐过渡。
 *
 * 尺寸由父级给（本组件 width/height 100%）；阴影也由父级的 drop-shadow 出
 * （mask 裁出的孔形阴影需要作用在包了 mask 的渲染结果上）。
 */
import CoverFallback from '@/components/ui/CoverFallback.vue'

defineProps({
  cover: { type: String, default: null },
  char: { type: String, default: '' },
  alt: { type: String, default: '' }
})
</script>

<style scoped>
.cd-disc-face {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  isolation: isolate;
  background: radial-gradient(
    circle closest-side at 50% 50%,
    var(--cd-disc-silver) 0 52%,
    var(--cd-disc-silver-deep) 74%,
    var(--cd-disc-silver) 88%,
    var(--cd-disc-silver-deep) 97%,
    var(--cd-disc-silver) 100%
  );
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.6),
    inset 0 0 0 2px rgba(0, 0, 0, 0.05),
    inset 0 2px 3px rgba(255, 255, 255, 0.45),
    inset 0 -3px 5px rgba(0, 0, 0, 0.08);
  /* 冲孔：closest-side 的 100% 即碟半径，孔径 12% 对齐实物比例 */
  -webkit-mask: radial-gradient(circle closest-side, transparent 0 11.8%, #000 12.4%);
  mask: radial-gradient(circle closest-side, transparent 0 11.8%, #000 12.4%);
}

.cd-disc-face__art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.92;
  filter: saturate(1.05) brightness(0.97);
}

.cd-disc-face__art--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(var(--color-primary-rgb), 0.08);
}

.cd-disc-face__film {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: var(--cd-film-opacity);
  /* 普通混合：粉彩镀膜薄罩在银底与印刷上（screen 在浅银底上会整体洗白），
     靠 sheen 层的定向高光补金属感 */
  background:
    conic-gradient(
      from 212deg,
      rgba(255, 178, 202, 0.4),
      rgba(176, 216, 255, 0.26) 16%,
      rgba(188, 252, 206, 0.3) 33%,
      rgba(255, 234, 186, 0.28) 52%,
      rgba(208, 192, 255, 0.32) 70%,
      rgba(255, 206, 228, 0.34) 86%,
      rgba(255, 178, 202, 0.4)
    ),
    conic-gradient(
      from 32deg,
      transparent 0 8%,
      rgba(255, 255, 255, 0.22) 14% 20%,
      transparent 27% 55%,
      rgba(255, 255, 255, 0.16) 62% 67%,
      transparent 74%
    );
}

.cd-disc-face__sheen {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: var(--disc-sheen, 0.55);
  transition: opacity 0.7s var(--ease-standard);
  background:
    linear-gradient(
      118deg,
      transparent 26%,
      rgba(255, 255, 255, 0.55) 38%,
      rgba(255, 255, 255, 0.12) 47%,
      transparent 58%
    ),
    radial-gradient(circle at 30% 18%, rgba(255, 255, 255, 0.6), transparent 34%),
    radial-gradient(circle at 72% 84%, rgba(255, 255, 255, 0.3), transparent 30%);
}

.cd-disc-face__hub {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle closest-side,
    transparent 0 11.8%,
    rgba(255, 255, 255, 0.95) 12.2% 13.2%,
    var(--cd-plastic) 14.5% 24%,
    var(--cd-disc-silver) 26% 35%,
    rgba(255, 255, 255, 0.35) 37% 38.5%,
    transparent 41%
  );
}
</style>
