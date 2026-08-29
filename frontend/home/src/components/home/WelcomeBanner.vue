<template>
  <div class="banner">
    <div class="bg"></div>
    <div class="content">
      <h1 class="site-title">yulabu's blog</h1>
      <h2 class="subtitle">
        <template v-if="showTyping">
          <span>{{ currentText }}</span>
          <span class="cursor"></span>
        </template>
        <template v-else>
          <span>{{ subtitle }}</span>
        </template>
      </h2>
    </div>
    <div class="waves">
      <svg class="wave wave-1" viewBox="0 0 2400 120" preserveAspectRatio="none">
        <path d="M0,60 C150,120 350,0 600,60 C850,120 1050,0 1200,60 L1200,120 L0,120 Z" />
        <path d="M1200,60 C1350,120 1550,0 1800,60 C2050,120 2250,0 2400,60 L2400,120 L1200,120 Z" />
      </svg>
      <svg class="wave wave-2" viewBox="0 0 2400 120" preserveAspectRatio="none">
        <path d="M0,70 C200,10 400,130 600,70 C800,10 1000,130 1200,70 L1200,120 L0,120 Z" />
        <path d="M1200,70 C1400,10 1600,130 1800,70 C2000,10 2200,130 2400,70 L2400,120 L1200,120 Z" />
      </svg>
      <svg class="wave wave-3" viewBox="0 0 2400 120" preserveAspectRatio="none">
        <path d="M0,80 C250,140 450,20 600,80 C750,140 950,20 1200,80 L1200,120 L0,120 Z" />
        <path d="M1200,80 C1450,140 1650,20 1800,80 C1950,140 2150,20 2400,80 L2400,120 L1200,120 Z" />
      </svg>
      <svg class="wave wave-4" viewBox="0 0 2400 120" preserveAspectRatio="none">
        <path d="M0,90 C180,30 420,150 600,90 C780,30 1020,150 1200,90 L1200,120 L0,120 Z" />
        <path d="M1200,90 C1380,30 1620,150 1800,90 C1980,30 2220,150 2400,90 L2400,120 L1200,120 Z" />
      </svg>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  subtitle: { type: String, default: '' },
  showTyping: { type: Boolean, default: true }
})

const texts = [
  '欢迎来到鱼辣不的博客',
  '记录生活，分享技术',
  '愿每一次思考都有回响'
]

const currentText = ref('')
let timer = null

const typeSpeed = 120
const deleteSpeed = 60
const stayAfterType = 2000
const switchDelay = 300

let textIndex = 0
let charIndex = 0
let isDeleting = false

function tick() {
  const fullText = texts[textIndex]

  if (isDeleting) {
    currentText.value = fullText.slice(0, charIndex - 1)
    charIndex--
  } else {
    currentText.value = fullText.slice(0, charIndex + 1)
    charIndex++
  }

  if (!isDeleting && charIndex === fullText.length) {
    isDeleting = true
    timer = setTimeout(tick, stayAfterType)
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false
    textIndex = (textIndex + 1) % texts.length
    timer = setTimeout(tick, switchDelay)
  } else {
    timer = setTimeout(tick, isDeleting ? deleteSpeed : typeSpeed)
  }
}

onMounted(() => {
  if (props.showTyping) {
    timer = setTimeout(tick, 500)
  }
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>
<style scoped>
.banner {
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 360px;
  overflow: hidden;
}

.banner::before {
  content: '';
  position: absolute;
  z-index: 1;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(8, 28, 19, .12), transparent 42%, rgba(8, 28, 19, .28)),
    radial-gradient(circle at 50% 42%, transparent 0, rgba(8, 28, 19, .2) 100%);
  pointer-events: none;
}

.bg {
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('@/assets/img/banner2.png');
  background-size: cover;
  background-position: center;
  filter: brightness(0.72) saturate(.92);
  transform: scale(1.015);
}

.content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 76px 24px 0;
}

.site-title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: clamp(24px, 5vw, 42px);
  color: rgba(255, 255, 255, .96);
  text-shadow: 0 4px 22px rgba(0, 0, 0, .4), 0 1px 2px rgba(0, 0, 0, .3);
  margin: 0 0 12px;
  letter-spacing: 3px;
  text-align: center;
}

.subtitle {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: clamp(18px, 4vw, 42px);
  color: rgba(255, 255, 255, .94);
  text-shadow: 0 3px 16px rgba(0, 0, 0, .4);
  margin: 0;
  letter-spacing: 4px;
  text-align: center;
  height: 1.3em;
  line-height: 1.3;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cursor {
  display: inline-block;
  width: 3px;
  height: 1em;
  background-color: white;
  margin-left: 6px;
  vertical-align: middle;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.6);
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.waves {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 140px;
  z-index: 3;
  pointer-events: none;
}

.wave {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 200%;
  height: 100%;
  animation: waveMove linear infinite;
}

.wave path {
  fill: var(--wave-color);
}

.wave-1 {
  --wave-color: var(--wave-1-color);
  bottom: -20px;
  height: 140px;
  opacity: 0.35;
  animation-duration: 14s;
}

.wave-2 {
  --wave-color: var(--wave-2-color);
  bottom: -10px;
  height: 120px;
  opacity: 0.45;
  animation-duration: 11s;
  animation-delay: -3s;
}

.wave-3 {
  --wave-color: var(--wave-3-color);
  bottom: 0;
  height: 100px;
  opacity: 0.55;
  animation-duration: 8s;
  animation-delay: -2s;
}

.wave-4 {
  --wave-color: var(--wave-4-color);
  bottom: 0;
  height: 80px;
  opacity: 1;
  animation-duration: 6s;
  animation-delay: -1s;
}

@keyframes waveMove {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
</style>
