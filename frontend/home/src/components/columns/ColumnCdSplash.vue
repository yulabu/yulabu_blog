<template>
  <Transition name="cd-splash" @after-leave="onAfterLeave">
    <div v-if="visible" class="cd-splash" :class="{ 'cd-splash--reveal': phase === 'reveal' }">
      <div class="cd-splash__veil" aria-hidden="true"></div>
      <!-- 飞行碟：三层各司其职 —— 外层从起点飞向中心放大，中层第二幕上浮淡出，
           内层慢速自转（flight 起旋，原位重叠期不转，避免与真碟错位穿帮） -->
      <div v-if="payload" class="cd-fly" :class="flyClass" :style="flyVars" aria-hidden="true">
        <div class="cd-fly__reveal">
          <div class="cd-fly__spin">
            <CdDiscFace :cover="payload.cover" :char="fallbackChar" alt="" />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
// CD 转场常驻岛：点击专栏光碟 → 碟片从原位抽出、飞向屏幕中心放大自转 →
// 换页完成后上浮淡出揭示专栏详情。结构与纪律完全对齐 PostSplash：
//   · client:only + 外包 div transition:persist（columns/index.astro 与
//     columns/[id].astro 同 key 声明）—— 软导航换页时整块 DOM 搬运，动画不中断；
//   · 信号来自 utils/columnSplash.ts（window + 自定义事件），直接访问 / 刷新 /
//     分享链接没有点击信号，本岛永远闲置，退化为普通跳转；
//   · astro:after-swap 校验 URL：换到了目标专栏 → 补足飞行时长后进第二幕；
//     中途改点别处 → 立即隐藏；SSR 迟迟不回 → SPLASH_MAX_MS 兜底淡出。
import { computed, onMounted, onUnmounted, ref } from 'vue'
import CdDiscFace from '@/components/columns/CdDiscFace.vue'

const SPLASH_MAX_MS = 6000
// 点击 → 第二幕的预期时长：抽出 0.18s + 飞行 0.85s + 中心悬停 0.3s。
// 换页早于它就等到这一拍再揭示，晚于它（SSR 慢）则换页瞬间立即揭示
const REVEAL_AFTER_MS = 1330
const REVEAL_HOLD_MS = 720

const visible = ref(false)
const payload = ref(null)
const phase = ref('origin') // origin 原位 | fly 飞向中心 | reveal 第二幕淡出
const flyVars = ref(null)
// 换页结果是否命中目标专栏；飞行结束拍点早于换页完成时，靠它在 swap 瞬间补揭示
let swapped = false

const fallbackChar = computed(() => ((payload.value && payload.value.name) || '栏').charAt(0) || '栏')

const flyClass = computed(() => ({
  'cd-fly--fly': phase.value !== 'origin',
  'cd-fly--reveal': phase.value === 'reveal',
}))

let revealTimer = null
let hideTimer = null
let maxTimer = null

function clearTimers() {
  clearTimeout(revealTimer)
  clearTimeout(hideTimer)
  clearTimeout(maxTimer)
  revealTimer = null
  hideTimer = null
  maxTimer = null
}

function computeFlyVars(rect) {
  // rect 缺席（理论兜底）：从屏幕中心以默认尺寸原地起浮
  const vw = window.innerWidth
  const vh = window.innerHeight
  const d0 = rect && rect.d > 0 ? rect.d : Math.min(vw, vh) * 0.3
  const x = rect ? rect.x : (vw - d0) / 2
  const y = rect ? rect.y : (vh - d0) / 2
  const d1 = Math.min(vh * 0.56, 420)
  return {
    '--fly-x': `${x}px`,
    '--fly-y': `${y}px`,
    '--fly-d': `${d0}px`,
    '--fly-dx': `${(vw - d0) / 2 - x}px`,
    '--fly-dy': `${(vh - d0) / 2 - y}px`,
    '--fly-s': `${d1 / d0}`,
  }
}

function show(data) {
  // 动效降级：偏好减少动态时整个转场不出现，普通跳转照常
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  clearTimers()
  swapped = false
  payload.value = data
  flyVars.value = computeFlyVars(data.rect)
  phase.value = 'origin'
  visible.value = true
  maxTimer = setTimeout(hide, Math.max(0, SPLASH_MAX_MS - (Date.now() - data.t0)))
  // 双 rAF：确保原位样式先完成一次绘制，再加飞行类，transition 才会生效
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!visible.value) return
      phase.value = 'fly'
      revealTimer = setTimeout(tryReveal, Math.max(0, REVEAL_AFTER_MS - (Date.now() - data.t0)))
    })
  })
}

function tryReveal() {
  if (!visible.value || phase.value === 'reveal') return
  if (!swapped) return // 换页未完成：碟在中心继续转，swap 命中后由 onAfterSwap 补揭示
  phase.value = 'reveal'
  hideTimer = setTimeout(hide, REVEAL_HOLD_MS)
}

function hide() {
  clearTimers()
  visible.value = false
}

function onAfterLeave() {
  payload.value = null
  flyVars.value = null
  phase.value = 'origin'
  swapped = false
}

function onSplashEvent(e) {
  show(e.detail)
}

function onAfterSwap() {
  if (!payload.value) return
  // 换页结果与被点专栏一致 → 飞行拍点未到就先记住，到了立即揭示；已过拍点 → 现在就揭示。
  // 中途改点别的页 → 立即隐藏
  if (location.pathname === `/columns/${payload.value.id}`) {
    swapped = true
    tryReveal()
  } else {
    hide()
  }
}

onMounted(() => {
  window.addEventListener('yulabu:column-splash', onSplashEvent)
  document.addEventListener('astro:after-swap', onAfterSwap)
})

onUnmounted(() => {
  window.removeEventListener('yulabu:column-splash', onSplashEvent)
  document.removeEventListener('astro:after-swap', onAfterSwap)
  clearTimers()
})
</script>

<style scoped>
.cd-splash {
  position: fixed;
  inset: 0;
  z-index: 3000; /* 与 PostSplash 同层：压过 Navbar 与页面全部内容 */
}

.cd-splash__veil {
  position: absolute;
  inset: 0;
  background: var(--overlay-bg);
  backdrop-filter: blur(9px);
  transition: opacity 0.65s ease;
}

/* 第二幕：光晕先撤，页面从碟后面浮出来 */
.cd-splash--reveal .cd-splash__veil {
  opacity: 0;
}

.cd-splash-enter-active {
  transition: opacity 0.3s ease;
}

.cd-splash-leave-active {
  transition: opacity 0.45s ease;
}

.cd-splash-enter-from,
.cd-splash-leave-to {
  opacity: 0;
}

.cd-fly {
  position: fixed;
  left: var(--fly-x);
  top: var(--fly-y);
  width: var(--fly-d);
  height: var(--fly-d);
  z-index: 2;
  transform: translate(0, 0) scale(1);
  transition: transform 0.85s var(--ease-standard);
  will-change: transform;
}

.cd-fly--fly {
  transform: translate(var(--fly-dx), var(--fly-dy)) scale(var(--fly-s));
}

.cd-fly__reveal {
  width: 100%;
  height: 100%;
  transition:
    transform 0.6s var(--ease-standard),
    opacity 0.6s ease;
}

.cd-fly--reveal .cd-fly__reveal {
  transform: translateY(-26px) scale(0.88);
  opacity: 0;
}

/* 飞行起旋：7s/圈匀速慢转，像拿在手里端详 */
.cd-fly__spin {
  width: 100%;
  height: 100%;
}

.cd-fly--fly .cd-fly__spin {
  animation: cd-spin 7s linear infinite;
}

@keyframes cd-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cd-fly--fly .cd-fly__spin {
    animation: none;
  }
}
</style>
