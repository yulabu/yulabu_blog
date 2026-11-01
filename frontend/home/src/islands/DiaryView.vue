<template>
  <main class="diary-page">
    <Skeleton v-if="loading" variant="card" :count="2" />

    <ContentState
      v-else-if="error"
      kind="error"
      size="page"
      retry-text="重新加载"
      @retry="fetchDiaries"
    >
      {{ error }}
    </ContentState>

    <template v-else>
      <!-- 照片墙：首屏 HTML 里就是整面墙（构建期烘焙 + 预渲染），点一张打开日记本 -->
      <DiaryGallery
        :diaries="diaries"
        :total="total"
        :active-index="activeIndex"
        @open="openNotebook"
      >
        <!-- 空态用同一张奶油纸：文字不能走页面主题色——纸是恒定白天材质，
             主题色在暗色下会翻成浅绿，压在纸面上读不出来 -->
        <p v-if="!diaries.length" class="diary-empty">墙上还空着</p>
      </DiaryGallery>

      <Pagination
        v-if="totalPages > 1"
        v-model:page="page"
        :totalPages="totalPages"
        class="diary-page__pager"
      />
    </template>

    <!-- 日记本浮层：点照片 → 冲印从墙上飞到屏幕中央 → 封面翻开 -->
    <DiaryNotebook
      v-if="activeDiary"
      :diary="activeDiary"
      :origin-rect="originRect"
      :has-prev="activeIndex > 0"
      :has-next="activeIndex < diaries.length - 1"
      :suspended="lightboxVisible"
      @close="closeNotebook"
      @prev="stepDiary(-1)"
      @next="stepDiary(1)"
      @preview-image="openLightbox"
    />

    <Teleport v-if="isMounted" to="body">
      <Transition name="lightbox">
        <div v-if="lightboxVisible" class="lightbox-overlay" @click="closeLightbox">
          <img :src="lightboxImages[lightboxIndex]" class="lightbox-img" alt="预览图片" @click.stop />
          <button class="lightbox-close" @click="closeLightbox" aria-label="关闭">
            <AppIcon icon="material-symbols:close" class="lightbox-close-icon" />
          </button>
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
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import ContentState from '@/components/ui/ContentState.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Pagination from '@/components/ui/Pagination.vue'
import DiaryGallery from '@/components/diary/DiaryGallery.vue'
import DiaryNotebook from '@/components/diary/DiaryNotebook.vue'
import { getPublicDiaries } from '@/api/diary'
import { createSilentSync } from '@/utils/liveData'

const props = defineProps({
  // 构建期烘焙的第 1 页数据（diary.astro 注入），页面必定传入（取数失败传空对象）。
  // 不写 default：Astro 对 JS SFC 的函数式 default 会破坏 .vue 的类型生成
  initialDiaries: { type: Object }
})

const baked = props.initialDiaries || {}
// 有烘焙数据就直接渲染 → 预渲染 HTML 里就有整面照片墙，首屏不闪「加载中」
const diaries = ref(baked.diaries || [])
const loading = ref(!diaries.value.length)
// 客户端取数失败：就地渲染失败态（可重试）；改前只 console.error，页面上只剩空墙
const error = ref('')
// Teleport 守卫：SSR 与客户端首帧都不输出 teleport 标记（Astro 向岛内注入的水合
// 脚本与 Vue 期望的空注释错位会触发 hydrateTeleport mismatch），挂载后再挂
const isMounted = ref(false)
const page = ref(1)
const totalPages = ref(baked.totalPages ?? 1)
const total = ref(baked.total ?? 0)
// 请求令牌：翻页与静默对账可能并发，只采纳最后一次请求的结果
let fetchToken = 0

// —— 日记本 ——
const activeIndex = ref(-1)
const originRect = ref(null)
const activeDiary = computed(() => diaries.value[activeIndex.value] || null)
// 关闭后把焦点还给刚才那张照片（键盘用户不会掉到页面顶部）
let originEl = null

// —— 图片灯箱 ——
const lightboxVisible = ref(false)
const lightboxImages = ref([])
const lightboxIndex = ref(0)

function openNotebook({ index, rect, el }) {
  originEl = el || null
  originRect.value = rect || null
  activeIndex.value = index
}

function closeNotebook() {
  activeIndex.value = -1
  originRect.value = null
  if (originEl && document.contains(originEl)) originEl.focus({ preventScroll: true })
  originEl = null
}

function stepDiary(step) {
  const next = activeIndex.value + step
  if (next < 0 || next >= diaries.value.length) return
  activeIndex.value = next
}

function openLightbox(images, index) {
  lightboxImages.value = images || []
  lightboxIndex.value = index || 0
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

// 灯箱不自己锁 body 滚动：它只从日记本里打开，而日记本已经锁着了（两处各锁一次，
// 先还原的那个会把另一处的锁一起撤掉）。这里只补 ESC —— 日记本在灯箱开着时挂起键盘
function onLightboxKey(e) {
  if (e.key !== 'Escape') return
  e.preventDefault()
  closeLightbox()
}

watch(lightboxVisible, (visible) => {
  if (visible) window.addEventListener('keydown', onLightboxKey)
  else window.removeEventListener('keydown', onLightboxKey)
})

function applyPage(res) {
  diaries.value = res.diaries
  totalPages.value = res.totalPages
  total.value = res.total
}

// 指纹：id 序列 + 总数（新增/删除/翻页长度变化都能察觉）
function fingerprintOf(res) {
  const list = res?.diaries ?? []
  return `${list.map((d) => d.id).join(',')}#${res?.total ?? ''}`
}

const silentSync = createSilentSync({
  baked: fingerprintOf(baked),
  load: () => getPublicDiaries(1),
  key: fingerprintOf,
  apply: (res) => {
    // 对账期间用户可能已翻页，别用第 1 页的数据覆盖当前页
    if (page.value !== 1) return
    // 用户正在读本子时也别换列表：否则 activeIndex / 被隐藏的卡片会错位。
    // 下次访问再对账，阅读体验优先。
    if (activeIndex.value >= 0) return
    applyPage(res)
  }
})

async function fetchDiaries() {
  const token = ++fetchToken
  loading.value = true
  error.value = ''
  try {
    const res = await getPublicDiaries(page.value)
    if (token !== fetchToken) return
    applyPage(res)
  } catch (e) {
    if (token !== fetchToken) return
    error.value = '日记加载失败，请稍后重试'
  } finally {
    if (token === fetchToken) loading.value = false
  }
}

watch(page, () => {
  // 换页时整面墙重画，顺手关掉可能开着的本子
  activeIndex.value = -1
  fetchDiaries()
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

onMounted(() => {
  isMounted.value = true
  // 有烘焙数据（第 1 页）时不再进入加载态，只静默对账；否则正常首屏拉取
  if (diaries.value.length) silentSync()
  else fetchDiaries()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onLightboxKey)
})
</script>

<style scoped>
/* 日记页走单列骨架（withRail=false），个人卡片不渲染，照片墙铺满内容列。
   骨架在单列模式用 display:contents，不提供网格 max-width / 内边距，
   所以这里自己给页面宽度与留白（与 PageFrame 两列模式的 1320 / 24px 对齐）。 */
.diary-page {
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
  padding: clamp(12px, 3vw, 32px) var(--page-padding) 64px;
}

/* 页码居中落在墙下方 */
.diary-page__pager {
  width: 100%;
}

/* 空态：一张奶油纸笺。纸是恒定白天材质，文字走 --paper-*，不随暗色翻转 */
.diary-empty {
  position: relative;
  z-index: 1;
  max-width: 420px;
  margin: 10px auto 0;
  padding: 34px 28px;
  border-radius: 2px;
  background-color: var(--gallery-print);
  background-image: radial-gradient(var(--notebook-line) 1px, transparent 1.2px);
  background-size: 18px 18px;
  box-shadow: var(--gallery-print-shadow);
  text-align: center;
  font-family: var(--font-kai);
  font-size: 15px;
  letter-spacing: 0.08em;
  color: var(--paper-text);
}

/* 灯箱（从日记本里的照片点开）*/
.lightbox-overlay {
  position: fixed;
  inset: 0;
  /* 压在日记本(2200) 之上，低于 PostSplash(3000) */
  z-index: 2600;
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
  display: flex;
  align-items: center;
  justify-content: center;
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

.lightbox-close-icon {
  font-size: 19px;
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

@media (max-width: 480px) {
  .lightbox-prev {
    left: 8px;
  }

  .lightbox-next {
    right: 8px;
  }
}
</style>
