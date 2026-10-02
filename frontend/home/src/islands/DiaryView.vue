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
      <!-- 书架：首屏 HTML 里就是一整面书（构建期烘焙 + 预渲染），水合后才可抽书 -->
      <DiaryShelf
        :diaries="diaries"
        :total="total"
        :page="page"
        :total-pages="totalPages"
        @open="openNotebook"
      >
        <!-- 不用 ContentState：它的文字走 --color-text（亮色下是深绿），压在木色上
             只有 ~1.5:1，读不出来。空架提示要用能在两种主题的木色上都读清的颜色 -->
        <p v-if="!diaries.length" class="diary-empty">书架还空着</p>
      </DiaryShelf>

      <Pagination
        v-if="totalPages > 1"
        v-model:page="page"
        :totalPages="totalPages"
        class="diary-page__pager"
      />
    </template>

    <!-- 日记本浮层：点书 → 从书脊位置飞到屏幕中央 → 封面翻开 -->
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
import DiaryShelf from '@/components/diary/DiaryShelf.vue'
import DiaryNotebook from '@/components/diary/DiaryNotebook.vue'
import { getPublicDiaries } from '@/api/diary'
import { createSilentSync } from '@/utils/liveData'

const props = defineProps({
  // 构建期烘焙的第 1 页数据（diary.astro 注入），页面必定传入（取数失败传空对象）。
  // 不写 default：Astro 对 JS SFC 的函数式 default 会破坏 .vue 的类型生成
  initialDiaries: { type: Object }
})

const baked = props.initialDiaries || {}
// 有烘焙数据就直接渲染 → 预渲染 HTML 里就有整面书架，首屏不闪「加载中」
const diaries = ref(baked.diaries || [])
const loading = ref(!diaries.value.length)
// 客户端取数失败：就地渲染失败态（可重试）；改前只 console.error，页面上只剩空书架
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
// 关闭后把焦点还给刚才那本书（键盘用户不会掉到页面顶部）
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
  // 换架时书架整体重画，顺手关掉可能开着的本子
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
/* 靠左铺满内容列（不要 margin: 0 auto）：骨架左栏已有卡片，若这里再居中，
   正文会离卡片多出一大截空白。与首页 PostList 对齐方式保持一致 */
.diary-page {
  width: 100%;
  max-width: 700px;
  /* 书架上方留出"房间的顶"：抽出的封面卡会向上探出第一层，窄屏（刊头隐藏）
     时这点余量也保证它不会顶到导航栏 */
  padding-top: clamp(24px, 7vw, 92px);
}

/* 页码与书架同宽，居中落在书架正下方 */
.diary-page__pager {
  max-width: 700px;
}

/* 空架提示：--book-title 是近白纸色，压亮/暗两种木色都够对比度 */
.diary-empty {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 76px 0 88px;
  text-align: center;
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 15px;
  letter-spacing: 0.08em;
  color: var(--book-title);
  opacity: 0.7;
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
