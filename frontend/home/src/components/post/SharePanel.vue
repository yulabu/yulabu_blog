<template>
  <!-- Teleport 守卫与 DiaryNotebook/AboutNode 同款：挂载后再挂，规避 hydrateTeleport mismatch -->
  <Teleport v-if="isMounted" to="body">
    <Transition name="share-pop" @after-leave="handleAfterLeave">
      <div v-if="open" class="share-overlay" @click="close">
        <div class="share-popup" role="dialog" aria-modal="true" aria-label="分享文章" @click.stop>
          <div class="share-body">
            <img v-if="posterUrl" class="share-poster" :src="posterUrl" alt="文章分享海报" />
            <Skeleton v-else-if="generating" variant="card" :count="1" :height="320" />
            <ContentState v-else kind="error" retry-text="重新生成" @retry="generatePoster">
              {{ error || '海报生成失败，请重试' }}
            </ContentState>
          </div>

          <div class="share-actions">
            <button class="share-act share-act--ghost" type="button" @click="copyLink">
              <AppIcon icon="material-symbols:link" />
              复制链接
            </button>
            <button
              class="share-act share-act--solid"
              type="button"
              :disabled="!posterUrl"
              @click="savePoster"
            >
              <AppIcon icon="material-symbols:download" />
              保存海报
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import ContentState from '@/components/ui/ContentState.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { copyText } from '@/composables/useClipboard'
import { useSharePoster } from '@/composables/useSharePoster'
import { formatDate } from '@/utils/date'
import { useToast } from '@/stores/toast'

const props = defineProps({
  postId: { type: Number, required: true },
  postTitle: { type: String, required: true },
  // 可为空串（无摘要/无封面的文章），海报自动降级对应区块
  summary: { type: String, required: true },
  cover: { type: String, required: true },
  author: { type: String, required: true },
  createdAt: { type: String, required: true },
  // 站点对外规范源（canonical origin，与 og:url 同源）：post/[id].astro 必传，不设默认值——
  // 分享链接恒为 blog.yulabu.cn，不存在「退化成访客当前域」的路径
  siteOrigin: { type: String, required: true }
})

const emit = defineEmits(['close'])

const { toast } = useToast()
const { generating, posterUrl, error, generate } = useSharePoster()

const isMounted = ref(false)
// 与 DiaryNotebook 同模式：关闭由本组件自己走完离场过渡，结束后再通知父级卸载
// （父级 v-if 直接卸载会吞掉动画）
const open = ref(true)

// 分享链接 = canonical：与 og:url 同源。链接文本与海报二维码是同一个 computed，
// 结构上不可能「显示 A、扫出 B」
const shareUrl = computed(() => new URL(`/post/${props.postId}`, props.siteOrigin).href)

// 站点对外信息（海报署名/头像用）：头像取 public/ 的稳定路径（与 og:avatar、个人卡片
// 同图，勿引 /_astro 哈希产物），站名与 FriendsView 信息卡同源
const SITE_NAME = 'Yulabu'
const AVATAR_URL = '/avatar.webp'

// ---- body 滚动锁（硬性规格）----
// SharePanel 自己负责加锁与释放；释放只有 restoreBodyOverflow() 这一个幂等实现，
// 遮罩点击 / ESC / 关闭按钮 / 离场动画结束 / 组件卸载所有路径只许调它；
// onBeforeUnmount 是最终兜底调用点（路由切换打断离场动画等场景锁必释放）。
// 文章页无其他锁使用者，本组件是该页唯一锁主。
let locked = false
let savedOverflow = ''

function lockBodyScroll() {
  if (locked) return
  savedOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  locked = true
}

function restoreBodyOverflow() {
  if (!locked) return
  document.body.style.overflow = savedOverflow
  locked = false
}

function close() {
  restoreBodyOverflow()
  open.value = false
}

function handleAfterLeave() {
  restoreBodyOverflow()
  emit('close')
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

// ---- 海报生成与操作 ----

function generatePoster() {
  generate({
    title: props.postTitle,
    summary: props.summary,
    coverUrl: props.cover,
    author: props.author,
    dateText: formatDate(props.createdAt),
    siteName: SITE_NAME,
    avatarUrl: AVATAR_URL,
    qrText: shareUrl.value
  }).catch(() => {}) // 失败已进 error 态（弹层内可重试），这里静默
}

async function copyLink() {
  const ok = await copyText(shareUrl.value)
  if (ok) toast('链接已复制')
  else toast('复制失败，请手动输入', 'error')
}

function savePoster() {
  if (!posterUrl.value) return
  const a = document.createElement('a')
  a.href = posterUrl.value
  a.download = `${props.postTitle.replace(/[\\/:*?"<>|]/g, ' ').trim() || '分享海报'}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
}

onMounted(() => {
  isMounted.value = true
  lockBodyScroll()
  window.addEventListener('keydown', onKeydown)
  generatePoster()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  restoreBodyOverflow()
})
</script>

<style scoped>
/* 在音乐播放器(1100)与 PostSplash(3000) 之间，与日记本同层 */
.share-overlay {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

/* 白底弹层：海报本身就是白卡，底同色才不出现「卡中卡」 */
.share-popup {
  width: min(440px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  padding: 18px 18px 20px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.share-body {
  display: flex;
  justify-content: center;
  min-height: 120px;
}

/* 海报 PNG 自带圆角（四角透明），drop-shadow 沿透明轮廓投影 */
.share-poster {
  display: block;
  max-width: 100%;
  max-height: 58vh;
  filter: drop-shadow(0 8px 24px rgba(31, 42, 34, 0.16));
}

.share-actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}

/* 与 CategoryChip solid/soft 同语义的双按钮：浅底绿字 + 实底绿底白字 */
.share-act {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  padding: 13px;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.share-act--ghost {
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-primary);
}

.share-act--ghost:hover {
  background: rgba(var(--color-primary-rgb), 0.16);
}

.share-act--solid {
  background: var(--color-primary);
  color: #fff;
}

.share-act--solid:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.share-act:disabled {
  opacity: 0.5;
  cursor: default;
}

/* 进出场动画（AboutNode 的 popup 同款节奏） */
.share-pop-enter-active {
  transition: opacity 0.3s ease;
}

.share-pop-leave-active {
  transition: opacity 0.2s ease;
}

.share-pop-enter-from,
.share-pop-leave-to {
  opacity: 0;
}

.share-pop-enter-active .share-popup {
  animation: share-pop-in 0.3s var(--ease-standard) forwards;
}

.share-pop-leave-active .share-popup {
  animation: share-pop-out 0.2s ease forwards;
}

@keyframes share-pop-in {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes share-pop-out {
  from {
    opacity: 1;
    transform: none;
  }
  to {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
}

@media (max-width: 480px) {
  .share-overlay {
    padding: 16px;
  }

  .share-popup {
    padding: 14px 14px 16px;
  }
}
</style>
