<template>
  <main class="friends-main">
    <GlassPanel class="friends-panel">
      <header class="friends-header">
        <span class="friends-header__icon">
          <AppIcon icon="material-symbols:group-outline" />
        </span>
        <div class="friends-header__text">
          <h1 class="friends-title">我的友链</h1>
          <p class="friends-subtitle">一些很棒的朋友，一起看更大的世界</p>
        </div>
        <span v-if="links.length" class="friends-count">{{ links.length }} 人</span>
      </header>

      <Skeleton v-if="loading" variant="card" :count="3" />

      <ContentState
        v-else-if="error"
        kind="error"
        size="panel"
        retry-text="重新加载"
        @retry="loadFirstPaint"
      >
        {{ error }}
      </ContentState>

      <ContentState v-else-if="links.length === 0" kind="empty" size="panel">
        暂无友链
      </ContentState>

      <div v-else class="card-grid">
        <GlassPanel
          as="a"
          v-for="link in links"
          :key="link.id"
          class="friend-card"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="card-preview">
            <img
              v-if="coverSrc(link) && !failedAvatars.has(coverSrc(link))"
              :src="coverSrc(link)"
              :alt="link.name"
              class="preview-img"
              loading="lazy"
              @error="failedAvatars.add(coverSrc(link))"
            />
            <CoverFallback v-else :text="link.name.charAt(0)" />
          </div>

          <!-- 无头像时用站名首字占住同一个圆位，保证卡片轮廓稳定 -->
          <img
            v-if="link.avatar && !failedAvatars.has(link.avatar)"
            :src="link.avatar"
            class="card-avatar"
            loading="lazy"
            @error="failedAvatars.add(link.avatar)"
          />
          <span v-else class="card-avatar card-avatar--fallback">
            <CoverFallback :text="link.name.charAt(0)" />
          </span>

          <div class="card-body card-info">
            <div class="card-name-row">
              <h3 class="card-title">{{ link.name }}</h3>
              <AppIcon icon="material-symbols:arrow-outward-rounded" class="card-external" />
            </div>
            <p class="card-text">{{ link.description || '这个站点还没有简介' }}</p>
          </div>
        </GlassPanel>
      </div>

      <!-- 「添加我到你的友链」信息卡：站长自己的站点信息，是静态内容（同 PersonalCard
           的个人介绍做法），不进后端、不参与取数与降级 -->
      <footer class="friend-me">
        <div class="friend-me__head">
          <AppIcon icon="material-symbols:lightbulb-outline" class="friend-me__bulb" />
          <div>
            <h2 class="friend-me__title">添加我到你的友链</h2>
            <p class="friend-me__hint">欢迎与我交换友链</p>
          </div>
        </div>

        <div class="friend-me__card">
          <div class="friend-me__intro">
            <img :src="SITE.avatar" :alt="SITE.name" class="friend-me__avatar" loading="lazy" />
            <div class="friend-me__who">
              <span class="friend-me__name">{{ SITE.name }}</span>
              <span class="friend-me__tagline">{{ SITE.description }}</span>
            </div>
          </div>

          <div v-for="field in SITE_FIELDS" :key="field.label" class="friend-me__row">
            <span class="friend-me__label">{{ field.label }}</span>
            <span class="friend-me__value" :title="field.value">{{ field.value }}</span>
            <button
              type="button"
              class="friend-me__copy"
              :aria-label="`复制${field.label}`"
              @click="copyField(field)"
            >
              <AppIcon icon="material-symbols:content-copy" class="friend-me__copy-icon" />
            </button>
          </div>
        </div>
      </footer>

      <!-- 「如何申请友链」：站长联系方式是静态内容（邮箱与 SiteFooter 同源），
           我的链接即信息卡展示的主域，不进后端、不参与取数与降级 -->
      <footer class="friend-apply">
        <span class="friend-apply__icon">
          <AppIcon icon="mdi:account-heart" />
        </span>
        <p class="friend-apply__text">
          <strong>如何申请友链？</strong>
          欢迎你来交换友链！请先在你的博客中添加我的链接（<a
            href="https://yulabu.cn/"
            target="_blank"
            rel="noopener noreferrer"
          >Yulabu</a>），再通过<a href="mailto:hello@yulabu.cn">邮件</a>或在任意文章的评论区告诉我你的博客地址哦～我会尽快处理～
        </p>
      </footer>
    </GlassPanel>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import CoverFallback from '@/components/ui/CoverFallback.vue'
import ContentState from '@/components/ui/ContentState.vue'
import GlassPanel from '@/components/ui/GlassPanel.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { getFriendLinks } from '@/api/friend'
import { createSilentSync } from '@/utils/liveData'
import { useToast } from '@/stores/toast'
import personalImgMeta from '@/assets/img/Personal_img.webp'

const props = defineProps({
  // 构建期烘焙的友链列表（friends.astro 注入），页面必定传入（取数失败传空数组）。
  // 不写 default：Astro 对 JS SFC 的函数式 default 会破坏 .vue 的类型生成
  initialLinks: { type: Array }
})

const { toast } = useToast()

// 站长自己的友链信息（静态站点信息，不进后端；头像与文案同 PersonalCard）。
// avatarUrl 是给对方外链的公开地址：public/ 下的稳定路径（avatar.webp 与
// 个人卡片头像同图），不引用 /_astro 哈希产物——那会随构建变化，不能给人外链
const SITE = {
  name: 'Yulabu',
  url: 'https://yulabu.cn/',
  avatar: personalImgMeta.src,
  avatarUrl: 'https://yulabu.cn/avatar.webp',
  description: '纳西妲世界第一可爱'
}

// 信息卡的四行字段（名称/头像/网址/简介），每行可独立复制
const SITE_FIELDS = [
  { label: '名称', value: SITE.name },
  { label: '头像', value: SITE.avatarUrl },
  { label: '网址', value: SITE.url },
  { label: '简介', value: SITE.description }
]

async function copyField(field) {
  try {
    await navigator.clipboard.writeText(field.value)
    toast(`${field.label}已复制`)
  } catch {
    toast('复制失败，请手动输入', 'error')
  }
}

// 有烘焙数据就直接渲染 → 预渲染 HTML 里就有内容，首屏不闪「加载中」
const links = ref(props.initialLinks || [])
const loading = ref(!links.value.length)
const error = ref('')
// 外链图加载失败的 URL（回落站名首字；友链图片一律外链，防盗链/死链不可避免）
const failedAvatars = ref(new Set())

// 大封面取图：背景图优先，无背景图时用头像顶上（头像同时在左下角圆形展示）
function coverSrc(link) {
  return link.preview_image || link.avatar || null
}

// 友链的排序/字段都可能被后台改动，指纹带上会变的字段
function fingerprintOf(list) {
  return (list ?? [])
    .map((l) => `${l.id}:${l.name}:${l.url}:${l.avatar ?? ''}:${l.preview_image ?? ''}:${l.description ?? ''}`)
    .join(',')
}

const silentSync = createSilentSync({
  baked: fingerprintOf(props.initialLinks),
  load: () => getFriendLinks(),
  key: fingerprintOf,
  apply: (list) => {
    links.value = list
  }
})

async function loadFirstPaint() {
  loading.value = true
  error.value = ''
  try {
    links.value = await getFriendLinks()
  } catch {
    error.value = '友链加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (props.initialLinks.length) silentSync()
  else loadFirstPaint()
})
</script>

<style scoped>
.friends-main {
  min-width: 0;
}

.friends-panel {
  padding: 28px 32px;
  border-radius: 16px;
}

/* ---- 头部：图标 + 标题/副标题 + 右侧人数徽标 ---- */
.friends-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border-divider);
}

.friends-header__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-primary);
  font-size: 22px;
}

.friends-title {
  margin: 0;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-heading);
  line-height: 1.3;
}

.friends-subtitle {
  margin: 3px 0 0;
  color: var(--color-muted);
  font-size: 13px;
}

.friends-count {
  flex-shrink: 0;
  margin-left: auto;
  padding: 4px 14px;
  border-radius: 999px;
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 600;
}

/* ---- 好友卡片：封面 + 圆头像 + 名称/简介（复用共享 .card-grid / .card-body） ----
   列下限从共享的 280px 收到 260px：面板内容宽约 884px，280px 只能两列，
   260px 在 1440 宽下正好三列（与参考图一致），窄屏自动回落两列/一列 */
.friends-panel .card-grid {
  margin-top: 20px;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.friend-card {
  border-radius: 16px;
  overflow: hidden;
  text-decoration: none;
  transition: transform 0.25s, box-shadow 0.25s;
  display: flex;
  flex-direction: column;
}

.friend-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px var(--shadow-color);
}

.card-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: rgba(var(--color-primary-rgb), 0.08);
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.friend-card:hover .preview-img {
  transform: scale(1.05);
}

.card-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 3px solid var(--bg-card-strong);
  margin-top: -26px;
  margin-left: 16px;
  position: relative;
  z-index: 1;
  background: var(--bg-card-strong);
  object-fit: cover;
}

.card-avatar--fallback {
  display: flex;
  overflow: hidden;
}

/* 首字兜底字号随头像缩小（CoverFallback 默认 56px 是给大封面区的） */
.card-avatar--fallback :deep(.ui-cover-fallback) {
  font-size: 20px;
}

/* 与专栏卡的区别：正文区更紧（卡高更矮）——这是必要的业务差异，其余排版走 .card-body */
.card-info {
  padding: 12px 16px 16px;
  /* 卡片正文沿用雅黑栈（改名前后一致：原 .card-name/.card-desc 各自声明过） */
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.card-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-external {
  flex-shrink: 0;
  margin-left: auto;
  font-size: 18px;
  color: var(--color-muted);
  transition: color 0.2s ease, transform 0.2s ease;
}

.friend-card:hover .card-external {
  color: var(--color-primary);
  transform: translate(2px, -2px);
}

/* ---- 底部：添加我到你的友链（站长信息卡） ---- */
.friend-me {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px dashed var(--border-divider);
}

.friend-me__head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 14px;
}

/* 标题左侧的竖条（参考图样式） */
.friend-me__head::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 4px;
  border-radius: 2px;
  background: var(--color-primary);
}

.friend-me__bulb {
  font-size: 20px;
  color: var(--color-primary);
}

.friend-me__title {
  margin: 0;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-primary);
}

.friend-me__hint {
  margin: 2px 0 0;
  color: var(--color-text);
  font-size: 12px;
}

.friend-me__card {
  margin-top: 14px;
  padding: 16px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.12);
  border-radius: 14px;
  background: rgba(var(--color-primary-rgb), 0.06);
}

.friend-me__intro {
  display: flex;
  align-items: center;
  gap: 14px;
}

.friend-me__avatar {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  border-radius: 16px;
  border: 2px solid var(--bg-card-strong);
  object-fit: cover;
  background: rgba(var(--color-primary-rgb), 0.08);
  box-shadow: 0 2px 8px var(--shadow-color);
}

.friend-me__who {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.friend-me__name {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-heading);
}

.friend-me__tagline {
  font-size: 13px;
  color: var(--color-muted);
}

/* 字段行：label + 值胶囊 + 复制按钮 */
.friend-me__row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  padding: 10px 12px 10px 16px;
  border-radius: 12px;
  background: rgba(var(--color-primary-rgb), 0.05);
}

.friend-me__label {
  flex-shrink: 0;
  width: 40px;
  color: var(--color-muted);
  font-size: 13px;
}

.friend-me__value {
  flex: 1;
  min-width: 0;
  padding: 5px 12px;
  border-radius: 9px;
  background: rgba(var(--color-primary-rgb), 0.14);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.friend-me__copy {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: rgba(var(--color-primary-rgb), 0.14);
  color: var(--color-primary);
  cursor: pointer;
  transition: background 0.2s ease;
}

.friend-me__copy:hover {
  background: rgba(var(--color-primary-rgb), 0.28);
}

.friend-me__copy-icon {
  font-size: 16px;
}

/* ---- 底部：如何申请友链（简洁一条） ---- */
.friend-apply {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 12px;
  padding: 14px 18px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.1);
  border-radius: 12px;
  background: rgba(var(--color-primary-rgb), 0.06);
}

.friend-apply__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(var(--color-primary-rgb), 0.14);
  color: var(--color-primary);
  font-size: 18px;
}

.friend-apply__text {
  margin: 0;
  color: var(--color-text);
  font-size: 13px;
  line-height: 1.7;
}

.friend-apply__text strong {
  margin-right: 6px;
  color: var(--color-heading);
}

.friend-apply__text a {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: none;
}

.friend-apply__text a:hover {
  text-decoration: underline;
}

/* 响应式降级：
 * ≤1024px  左栏已由 PageFrame 隐藏，卡片占满
 * ≤480px   面板与申请条内边距收紧
 */
@media (max-width: 480px) {
  .friends-panel {
    padding: 20px 16px;
  }

  .friend-me__card {
    padding: 12px;
  }

  .friend-me__avatar {
    width: 56px;
    height: 56px;
    border-radius: 14px;
  }

  .friend-me__row {
    gap: 8px;
    padding: 8px 8px 8px 12px;
  }

  .friend-me__label {
    width: 34px;
  }

  .friend-apply {
    padding: 12px 14px;
  }
}
</style>
