<template>
  <Teleport v-if="isMounted" to="body">
    <Transition name="nb" @after-leave="emit('close')">
      <div
        v-if="open"
        class="nb"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diary-nb-title"
        @click.self="close"
      >
        <div class="nb__stage">
          <div
            ref="bookEl"
            class="nb__book"
            :class="{ 'is-ready': ready, 'is-rest': resting }"
            tabindex="-1"
          >
            <!-- 纸面背景层：装订侧压痕 + 打孔 -->
            <div class="nb__paper" aria-hidden="true">
              <span class="nb__binding">
                <span v-for="n in 5" :key="n" class="nb__hole"></span>
              </span>
            </div>

            <div ref="scrollEl" class="nb__scroll">
              <Transition :name="slideName" mode="out-in">
                <article :key="diary.id" class="nb__leaf">
                  <header class="nb__head">
                    <span class="nb__date">{{ longDate }}</span>
                    <span class="nb__weekday">{{ weekday }}</span>
                    <span v-if="ago" class="nb__ago">{{ ago }}</span>
                  </header>

                  <h2 id="diary-nb-title" class="nb__title">{{ title }}</h2>

                  <p v-if="body" class="nb__text">{{ body }}</p>
                  <p v-else-if="!image" class="nb__text nb__text--faint">这天只写了一句。</p>

                  <button
                    v-if="image"
                    class="nb__photo"
                    type="button"
                    :style="{ '--tilt': tilt + 'deg' }"
                    @click="emit('preview-image', diary.images, 0)"
                  >
                    <img class="nb__photo-img" :src="image" alt="查看日记原图" />
                  </button>
                </article>
              </Transition>
            </div>

            <div class="nb__foot">
              <button class="nb__step" type="button" :disabled="!hasPrev" @click="go(-1)">
                <AppIcon icon="material-symbols:chevron-left" class="nb__step-icon" />
                前一篇
              </button>
              <span class="nb__foot-sep" aria-hidden="true"></span>
              <button class="nb__step" type="button" :disabled="!hasNext" @click="go(1)">
                后一篇
                <AppIcon icon="material-symbols:chevron-right" class="nb__step-icon" />
              </button>
            </div>

            <!-- 封面层：飞行落位后绕装订侧翻开，转过 90° 即被 backface 隐去 -->
            <div class="nb__cover" aria-hidden="true">
              <img v-if="image" class="nb__cover-img" :src="image" alt="" />
              <span class="nb__cover-label">
                <span class="nb__cover-date">{{ longDate }}</span>
                <span class="nb__cover-title">{{ title }}</span>
              </span>
            </div>
          </div>
        </div>

        <button class="nb__close" type="button" aria-label="关闭" @click="close">
          <AppIcon icon="material-symbols:close" class="nb__close-icon" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatDateLong, formatRelativeTime, formatWeekday } from '@/utils/date'
import { diaryBody, diaryPhotoTilt, diaryTitle } from '@/utils/diary'

const props = defineProps({
  diary: { type: Object, required: true },
  /** 被点那本书书脊条的屏幕矩形：日记本从它那儿起飞（FLIP） */
  originRect: { type: Object, default: null },
  hasPrev: { type: Boolean, default: false },
  hasNext: { type: Boolean, default: false },
  /** 灯箱压在本子之上时挂起键盘与滚动管理，避免 ESC / 方向键两边同时响应 */
  suspended: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'prev', 'next', 'preview-image'])

// Teleport 守卫：SSR 与客户端首帧都不输出 teleport 标记（Astro 向岛内注入的水合脚本
// 与 Vue 期望的空注释错位会触发 hydrateTeleport mismatch），挂载后再挂
const isMounted = ref(false)
// 关闭由本组件自己走完离场过渡，结束后再通知父级卸载（父级 v-if 直接卸载会吞掉动画）
const open = ref(true)

const bookEl = ref(null)
const scrollEl = ref(null)
// 飞行入场三段：量取起点（隐藏）→ 定稿起点 → 过渡到静止态
const ready = ref(false)
const resting = ref(false)
const dir = ref(1)

const title = computed(() => diaryTitle(props.diary))
const body = computed(() => diaryBody(props.diary))
const image = computed(() => (props.diary.images && props.diary.images[0]) || '')
const longDate = computed(() => formatDateLong(props.diary.created_at))
const weekday = computed(() => formatWeekday(props.diary.created_at))
// 相对时间只在客户端出现：放进预渲染/SSR 会烘焙成过期文本，且两侧必然算不出同一句
const ago = computed(() => formatRelativeTime(props.diary.created_at))
const tilt = computed(() => diaryPhotoTilt(props.diary.id))
const slideName = computed(() => (dir.value > 0 ? 'leaf-next' : 'leaf-prev'))

let bodyOverflow = ''

function close() {
  open.value = false
}

function go(step) {
  if (step < 0 && !props.hasPrev) return
  if (step > 0 && !props.hasNext) return
  dir.value = step
  emit(step < 0 ? 'prev' : 'next')
}

function onKeydown(e) {
  if (props.suspended) return
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    go(1)
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    go(-1)
  }
}

watch(
  () => props.diary.id,
  () => {
    if (scrollEl.value) scrollEl.value.scrollTop = 0
  }
)

onMounted(async () => {
  isMounted.value = true
  bodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)

  await nextTick()
  const el = bookEl.value
  const o = props.originRect
  const reduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (el && o && o.height > 0 && !reduce) {
    const r = el.getBoundingClientRect()
    el.style.setProperty('--fly-x', `${o.left + o.width / 2 - (r.left + r.width / 2)}px`)
    el.style.setProperty('--fly-y', `${o.top + o.height / 2 - (r.top + r.height / 2)}px`)
    el.style.setProperty('--fly-s', String(o.height / r.height))
    // 读一次布局，让"起点"这一帧先定稿（此时 is-ready 未挂、transition 关着）；
    // 不这样点两次的话起点与终点会合并成一次样式计算，过渡根本不触发
    void el.offsetWidth
    ready.value = true
    await nextTick()
    // 再读一次，确保 is-ready（打开 transition）已被计算过一次，然后才切静止态。
    // 这里刻意不用 requestAnimationFrame：页面被节流/在后台时 rAF 长时间不回调，
    // 飞行会卡在起点（实测无头/后台标签页里 rAF 800ms 都不触发）
    void el.offsetWidth
    resting.value = true
  } else {
    ready.value = true
    resting.value = true
  }

  if (bookEl.value) bookEl.value.focus({ preventScroll: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = bodyOverflow
})
</script>

<style scoped>
.nb {
  position: fixed;
  inset: 0;
  /* 在音乐播放器(1100) 与 PostSplash(3000) 之间；灯箱再压在它之上(2600) */
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--notebook-scrim);
  backdrop-filter: blur(7px);
}

.nb__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.nb__book {
  position: relative;
  display: block;
  /* 不能用 min(720px, 100%)：父级 .nb__stage 是 flex 项，宽度又要由内容决定，
     形成循环依赖 → 百分比解析不了，整条 min() 失效退回 auto → 书宽 0（实踩） */
  width: min(720px, 92vw);
  height: min(660px, 78vh);
  height: min(660px, 78dvh);
  border-radius: 5px 11px 11px 5px;
  visibility: hidden;
  outline: none;
  perspective: 1800px;
  /* 起点态（--fly-* 由行内 style 写入）不带过渡，挂上 is-ready 后才开 */
  transform: translate(var(--fly-x, 0px), var(--fly-y, 0px)) scale(var(--fly-s, 1));
  box-shadow: 0 42px 72px -30px rgba(0, 0, 0, 0.72);
}

.nb__book.is-ready {
  visibility: visible;
  transition: transform 0.46s cubic-bezier(0.2, 0.7, 0.2, 1);
}

/* 落位态：直接覆盖 transform，而不是在类里把 --fly-* 改回 0 ——
   起点值写在行内 style 上，行内自定义属性优先级高于类规则，改类里的值是改不动的（实踩） */
.nb__book.is-rest {
  transform: none;
}

/* 纸面 */
.nb__paper {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  background:
    radial-gradient(120% 90% at 12% 0%, rgba(255, 255, 255, 0.26), transparent 60%),
    linear-gradient(160deg, var(--notebook-paper), var(--notebook-paper-2));
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.14);
}

.nb__binding {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;
  width: 34px;
  padding: 22px 0;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.03) 62%, transparent);
  border-right: 1px solid rgba(0, 0, 0, 0.09);
}

.nb__hole {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.34);
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.5),
    0 1px 0 rgba(255, 255, 255, 0.5);
}

.nb__scroll {
  position: absolute;
  inset: 0 0 52px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 40px 40px 24px 62px;
}

.nb__leaf {
  min-height: 100%;
}

.nb__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 14px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  color: var(--color-muted);
}

.nb__date {
  font-family: Georgia, 'LXGW WenKai', serif;
  font-size: 15px;
  letter-spacing: 0.04em;
}

.nb__weekday {
  font-size: 12px;
}

.nb__ago {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.75;
}

.nb__title {
  margin: 0 0 18px;
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 25px;
  font-weight: 700;
  line-height: 1.5;
  color: var(--color-heading);
  word-break: break-word;
}

.nb__text {
  margin: 0 0 18px;
  font-size: 15px;
  line-height: 2;
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-word;
}

.nb__text--faint {
  opacity: 0.6;
}

/* 贴在纸上的照片：白边 + 一点倾斜（角度由 id 派生，不是随机） */
.nb__photo {
  display: block;
  width: fit-content;
  max-width: min(100%, 470px);
  margin: 6px 0 14px;
  padding: 9px;
  border: 0;
  border-radius: 2px;
  background: #fdfbf5;
  cursor: zoom-in;
  transform: rotate(var(--tilt));
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.22),
    0 10px 22px -10px rgba(0, 0, 0, 0.45);
}

.nb__photo-img {
  display: block;
  max-width: 100%;
  max-height: 46vh;
  border-radius: 1px;
  object-fit: contain;
}

/* 底部翻页栏 */
.nb__foot {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  height: 52px;
  border-top: 1px solid rgba(0, 0, 0, 0.09);
  border-radius: 0 0 11px 5px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.05));
}

.nb__step {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 5px 9px;
  border: 0;
  border-radius: 4px;
  background: none;
  cursor: pointer;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 13px;
  color: var(--color-text);
  transition: color 0.2s ease, background 0.2s ease;
}

.nb__step:hover:not(:disabled) {
  color: var(--color-heading);
  background: rgba(0, 0, 0, 0.05);
}

.nb__step:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.nb__step-icon {
  font-size: 17px;
}

.nb__foot-sep {
  width: 1px;
  height: 15px;
  background: rgba(0, 0, 0, 0.14);
}

/* 封面：从装订侧翻开 */
.nb__cover {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  background: linear-gradient(155deg, var(--notebook-shell), var(--notebook-shell-2));
  transform-origin: left center;
  backface-visibility: hidden;
  transition: transform 0.52s cubic-bezier(0.42, 0, 0.2, 1) 0.32s;
}

/* 落位后延迟起翻：与飞行（0.46s）错开，读作「书飞过来 → 翻开」 */
.nb__book.is-rest .nb__cover {
  transform: rotateY(-164deg);
}

.nb__cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nb__cover-label {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 34px 26px 24px;
  color: var(--book-title);
  background: linear-gradient(transparent, rgba(8, 10, 9, 0.78));
}

.nb__cover-date {
  font-family: Georgia, serif;
  font-size: 13px;
  letter-spacing: 0.06em;
  opacity: 0.9;
}

.nb__cover-title {
  font-family: 'LXGW WenKai', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.4;
}

.nb__close {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  cursor: pointer;
  transition: background 0.2s ease;
}

.nb__close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.nb__close-icon {
  font-size: 19px;
}

/* 整块遮罩淡入淡出；离场时本子收一点 */
.nb-enter-active,
.nb-leave-active {
  transition: opacity 0.28s ease;
}

.nb-enter-from,
.nb-leave-to {
  opacity: 0;
}

.nb-leave-active .nb__book {
  transition: transform 0.28s ease;
  transform: scale(0.96);
}

/* 相邻日记切换：按方向滑一小段 */
.leaf-next-enter-from {
  opacity: 0;
  transform: translateX(26px);
}

.leaf-next-leave-to {
  opacity: 0;
  transform: translateX(-26px);
}

.leaf-prev-enter-from {
  opacity: 0;
  transform: translateX(-26px);
}

.leaf-prev-leave-to {
  opacity: 0;
  transform: translateX(26px);
}

.leaf-next-enter-active,
.leaf-next-leave-active,
.leaf-prev-enter-active,
.leaf-prev-leave-active {
  transition: opacity 0.16s ease, transform 0.2s ease;
}

@media (max-width: 768px) {
  .nb {
    padding: 14px;
  }

  .nb__book {
    height: min(660px, 84vh);
    height: min(660px, 84dvh);
  }

  .nb__binding {
    width: 24px;
  }

  .nb__hole {
    width: 8px;
    height: 8px;
  }

  .nb__scroll {
    inset: 0 0 46px;
    padding: 28px 20px 18px 36px;
  }

  .nb__title {
    font-size: 21px;
  }

  .nb__text {
    font-size: 14.5px;
    line-height: 1.95;
  }

  .nb__photo-img {
    max-height: 38vh;
  }

  .nb__foot {
    height: 46px;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .nb {
    padding: 10px;
  }

  .nb__book {
    border-radius: 4px 8px 8px 4px;
  }

  .nb__scroll {
    padding: 22px 15px 14px 30px;
  }

  .nb__head {
    flex-wrap: wrap;
    gap: 6px;
  }

  .nb__ago {
    margin-left: 0;
  }
}

/* 降低动态效果：不飞行、不翻封面，本子直接出现 */
@media (prefers-reduced-motion: reduce) {
  .nb-enter-active,
  .nb-leave-active,
  .leaf-next-enter-active,
  .leaf-next-leave-active,
  .leaf-prev-enter-active,
  .leaf-prev-leave-active {
    transition: opacity 0.15s ease;
  }

  .leaf-next-enter-from,
  .leaf-next-leave-to,
  .leaf-prev-enter-from,
  .leaf-prev-leave-to {
    transform: none;
  }

  .nb-leave-active .nb__book {
    transform: none;
  }

  .nb__cover {
    display: none;
  }
}
</style>
