<template>
  <Transition name="post-splash" @after-leave="onAfterLeave">
    <div v-if="visible" class="post-splash">
      <!-- 花瓣层：绝对定位、不参与 flex 居中；卡后层虚、卡前层实，靠 z-index 造景深 -->
      <div class="post-splash__petals post-splash__petals--back" aria-hidden="true">
        <span v-for="(p, i) in backPetals" :key="`b${i}`" class="petal" :style="petalStyle(p)" />
      </div>

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
          <span class="post-splash__hint" role="status">
            正在打开文章<span class="post-splash__dots" aria-hidden="true"><i /><i /><i /></span>
          </span>
        </div>
      </div>

      <div class="post-splash__petals post-splash__petals--front" aria-hidden="true">
        <span v-for="(p, i) in frontPetals" :key="`f${i}`" class="petal" :style="petalStyle(p)" />
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

// ---- 樱花瓣参数 ----
// 确定性伪随机（整数哈希 + 雪崩）而非 Math.random：本岛是 client:only、随机值本无所谓，
// 但确定性生成后即便将来改成 SSR 也不会水合不一致，且每次弹出的画面一致。
function hash01(n) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

function petalParams(count, salt, cfg) {
  const r3 = (n) => Math.round(n * 1000) / 1000
  return Array.from({ length: count }, (_, i) => {
    const r = (n) => hash01(i * 31 + n * 7 + salt)
    const dur = cfg.dur[0] + r(1) * (cfg.dur[1] - cfg.dur[0])
    return {
      x: r3(2 + r(2) * 96),
      tilt: r3(-40 + r(3) * 80),
      size: r3(cfg.size[0] + r(4) * (cfg.size[1] - cfg.size[0])),
      drift: r3(-90 + r(5) * 180),
      o: r3(cfg.o[0] + r(6) * (cfg.o[1] - cfg.o[0])),
      dur: r3(dur),
      // 负延迟：卡片只活 2s，零延迟的话这 2 秒花瓣还在屏幕上方几十 vh 处，等于白做
      delay: r3(-r(7) * dur),
    }
  })
}

// 尺寸/不透明度/数量三者都定过：浅色模式遮罩是薄荷绿(202,242,203)，小而淡的花瓣叠上去会被
// 中和成中性奶油色——实测 6–16px @0.30–0.55 时全屏只有约 220 个暖粉像素（读作"雪"而非"樱花"）；
// 提到 13–24px @0.55–0.82 后约 1400 个，粉色才立得住。
// 卡后花瓣会被卡片半透明玻璃洗淡（约一半落在卡后），所以数量给得比"看起来需要的"多。
// 改这三个参数后请实观：调大像彩纸，调小回"雪"。
const backPetals = petalParams(16, 0, { dur: [9, 14], size: [13, 24], o: [0.55, 0.82] })
const frontPetals = petalParams(8, 97, { dur: [5.5, 8.5], size: [10, 17], o: [0.8, 0.98] })

function petalStyle(p) {
  return {
    '--x': `${p.x}%`,
    '--tilt': `${p.tilt}deg`,
    '--size': `${p.size}px`,
    '--dur': `${p.dur}s`,
    '--delay': `${p.delay}s`,
    '--drift': `${p.drift}px`,
    '--o': `${p.o}`,
  }
}

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

/* 花瓣层：卡后层（默认 z-index 0）与卡前层（z-index 2）夹住卡片。
   overflow: hidden 必需——花瓣 translate 到 110vh，不裁会撑出滚动条。 */
.post-splash__petals {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.post-splash__petals--front {
  z-index: 2;
}

/* 花瓣形状：非对称圆角（圆润瓣身 + 一个偏尖的瓣尖）。
   别用 border-radius: 100% 0 100% 0——那是两尖的梭形，在 13–24px 尺度上经 rotateY 压缩
   会读成"粉色针片/叶片"，实测对比过 6 种瓣形后选了这个。
   底色是浅粉→深粉的对角渐变，这是读作"樱花"的关键色；白色高光只占上左一小块做瓣面反光，
   若高光铺满（如整瓣径向浅粉）会把基色洗成中性奶油色。 */
.petal {
  position: absolute;
  top: 0;
  left: var(--x);
  width: var(--size);
  height: calc(var(--size) * 1.15);
  border-radius: 62% 38% 58% 42% / 55% 62% 38% 45%;
  background:
    radial-gradient(48% 48% at 28% 24%, rgba(255, 255, 255, 0.3), transparent 64%),
    linear-gradient(150deg, var(--color-sakura-light), var(--color-sakura-deep));
  /* rotate 是独立变换属性，与下面动画的 translate / transform 互不覆盖 */
  rotate: var(--tilt);
  opacity: calc(var(--o) * var(--petal-alpha, 1));
  animation:
    petal-fall var(--dur) linear var(--delay) infinite,
    petal-flutter calc(var(--dur) / 3.6) ease-in-out var(--delay) infinite;
}

.post-splash__petals--back .petal {
  filter: blur(2.5px);
}

/* 下落路径走非线性折线（横向来回摆），比直线更像樱花飘落；首尾淡入淡出避免硬切 */
@keyframes petal-fall {
  0% {
    translate: 0 -10vh;
    opacity: 0;
  }
  8% {
    opacity: calc(var(--o) * var(--petal-alpha, 1));
  }
  25% {
    translate: calc(var(--drift) * 0.3) 24vh;
  }
  50% {
    translate: calc(var(--drift) * 0.72) 52vh;
  }
  75% {
    translate: calc(var(--drift) * 0.52) 82vh;
  }
  92% {
    opacity: calc(var(--o) * var(--petal-alpha, 1));
  }
  100% {
    translate: var(--drift) 110vh;
    opacity: 0;
  }
}

/* 翻滚：绕 Z 摆动 + 绕 Y 翻面，花瓣时正时侧。
   注意 rotateY 只能到 52°——翻到 90° 时花瓣完全侧视、投影宽度归零（实测有花瓣宽度掉到 2px，
   即每轮都有一段时间看不见），只在小角度内摆动才有"翻面"感又不会闪没 */
@keyframes petal-flutter {
  0%,
  100% {
    transform: rotate(-30deg) rotateY(0deg);
  }
  50% {
    transform: rotate(18deg) rotateY(52deg);
  }
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
  position: relative;
  z-index: 1;
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

/* 封底渐隐：消掉封面与正文之间的硬切边，让画面化进卡片玻璃底 */
.post-splash__cover::after {
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  z-index: 1;
  height: 30%;
  background: linear-gradient(to top, var(--bg-glass-start), transparent);
  pointer-events: none;
}

/* 入场扫光：一次性斜向高光扫过封面，给「打开」一点仪式感。
   动画必须挂在 ::before 的基础规则上、不能挂 post-splash-enter-active——那个类在根节点
   opacity 过渡结束（0.4s）就被 Vue 摘掉，而这条时间轴是 0.12s + 0.9s，挂上去只会跑到 31%
   就把亮带掐没（实测 translate 停在 -45.6%，亮带刚压到封面左边缘，肉眼看不见）。
   卡片整体由 v-if 重建，所以每次弹出都会重播一次。 */
.post-splash__cover::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  background: linear-gradient(105deg, transparent 34%, rgba(255, 255, 255, 0.5) 48%, transparent 62%);
  translate: -120% 0;
  opacity: 0;
  pointer-events: none;
  animation: cover-sheen 0.9s ease-out 0.12s 1 both;
}

@keyframes cover-sheen {
  0% {
    translate: -120% 0;
    opacity: 0;
  }
  25% {
    opacity: 1;
  }
  100% {
    translate: 120% 0;
    opacity: 0;
  }
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

/* 动态省略号：三点错峰脉冲（宽度恒定，不抖） */
.post-splash__dots {
  display: inline-flex;
  gap: 4px;
  margin-left: 5px;
  vertical-align: middle;
}

.post-splash__dots i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  animation: splash-dot 1.2s ease-in-out infinite;
}

.post-splash__dots i:nth-child(2) {
  animation-delay: 0.16s;
}

.post-splash__dots i:nth-child(3) {
  animation-delay: 0.32s;
}

@keyframes splash-dot {
  0%,
  100% {
    opacity: 0.22;
    translate: 0 0;
  }
  30% {
    opacity: 1;
    translate: 0 -2px;
  }
}

/* 暗色底（25,35,30）比亮色底暗得多，花瓣不透明度不能压太狠，否则同样读不出粉色。
   整个选择器必须一起包进 :global()——Vue scoped 对「:global() + 后代」混用会丢弃后代部分 */
:global(html[data-theme='dark'] .post-splash__petals) {
  --petal-alpha: 0.85;
}

/* 移动端收紧：砍的必须是卡后层——带 filter: blur() 的才是合成成本大头，且小屏上卡片几乎
   占满视野、卡后花瓣本就落在玻璃后被洗淡。所以留清晰可见的卡前层，只削减数量：
   卡后 16 → 6（768px）→ 4（480px），卡前 8 → 4 → 3，合计 24 → 10 → 7 片 */
@media (max-width: 768px) {
  .post-splash {
    padding: 20px;
  }

  .post-splash__petals--back .petal:nth-child(n + 7) {
    display: none;
  }

  .post-splash__petals--front .petal:nth-child(n + 5) {
    display: none;
  }
}

@media (max-width: 480px) {
  .post-splash {
    padding: 12px;
  }

  .post-splash__cover {
    height: clamp(200px, 52vw, 300px);
    max-height: 42vh;
  }

  .post-splash__cover-fallback {
    font-size: 64px;
  }

  .post-splash__body {
    padding: 20px 20px 24px;
    gap: 12px;
  }

  .post-splash__title {
    font-size: 22px;
  }

  .post-splash__summary {
    font-size: 15px;
  }

  .post-splash__petals--back .petal:nth-child(n + 5) {
    display: none;
  }

  .post-splash__petals--front .petal:nth-child(n + 4) {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-splash__petals {
    display: none;
  }

  .post-splash__dots i {
    animation: none;
    opacity: 0.6;
  }

  .post-splash__cover::before {
    animation: none;
  }
}
</style>
