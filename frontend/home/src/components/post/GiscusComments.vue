<template>
  <GlassPanel class="comments-card">
    <div class="comments-header">
      <span class="line"></span>
      <h4>评论</h4>
    </div>
    <div ref="hostEl" class="giscus-host"></div>
    <ContentState v-if="stage !== 'ready'" size="compact" icon="mdi:message-text">
      <template v-if="stage === 'failed'">
        评论区加载失败，可刷新重试，或到
        <a class="comments-fallback" :href="GISCUS.fallbackUrl" target="_blank" rel="noopener">
          GitHub 讨论区
        </a>
        参与讨论
      </template>
      <template v-else>正在加载评论区…</template>
    </ContentState>
  </GlassPanel>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import GlassPanel from '@/components/common/GlassPanel.vue'
import ContentState from '@/components/common/ContentState.vue'

// giscus 公开标识（非密钥，可入库），取自 https://giscus.app 配置器。
// 评论落在独立仓库 yulabu/Blog_Content，与源码仓库解耦：
// 源码仓库转私有或重命名都不影响存量评论。
const GISCUS = {
  repo: 'yulabu/Blog_Content',
  repoId: 'R_kgDOUXt4oQ',
  category: '评论',
  categoryId: 'DIC_kwDOUXt4oc4DFbiY',
  // pathname 映射：与标题无关（改标题不丢评论），且 yulabu.cn / blog.yulabu.cn
  // 的同一篇文章共用同一条讨论帖，不会分裂成两份
  mapping: 'pathname',
  strict: '0',
  inputPosition: 'bottom',
  reactionsEnabled: '1',
  emitMetadata: '0',
  lang: 'zh-CN',
  // giscus.app 不可达时的出口
  fallbackUrl: 'https://github.com/yulabu/Blog_Content/discussions'
}

const GISCUS_ORIGIN = 'https://giscus.app'
const READY_TIMEOUT_MS = 10000

const hostEl = ref(null)
// waiting → ready / failed；初始态与 SSR 一致，水合无 mismatch
const stage = ref('waiting')
let io = null
let themeObserver = null
let timer = null
let injected = false
// 已推给 giscus 的主题名，用于去重（见 pushTheme）
let pushedTheme = null

// giscus 自带的「无边框」主题，随站点亮暗热切换（setConfig 改配置，不重载 iframe）。
// 刻意不自托管配色主题：那需要 nginx 给主题 CSS 放 CORS 头（样式表是 giscus.app 的跨域
// iframe 加载的），多一条「配错就静默变成无主题」的链路，本地 dev 也因混合内容规则看不到效果
const THEME = { light: 'noborder_light', dark: 'noborder_dark' }

const themeName = () =>
  THEME[document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light']

function settle(next) {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (stage.value !== next) stage.value = next
}

// giscus 支持运行时改配置：切主题只发一条 postMessage，不重载 iframe。
// 去重：注入时带的 data-theme 已是最新，而 widget 的每条消息都会走到这里，
// 只推「与上次不同」的主题，避免无意义的重复 setConfig
function pushTheme() {
  const name = themeName()
  if (name === pushedTheme) return
  const iframe = hostEl.value?.querySelector('iframe.giscus-frame')
  if (!iframe) return
  pushedTheme = name
  iframe.contentWindow?.postMessage({ giscus: { setConfig: { theme: name } } }, GISCUS_ORIGIN)
}

function onMessage(event) {
  if (event.origin !== GISCUS_ORIGIN) return
  const iframe = hostEl.value?.querySelector('iframe.giscus-frame')
  // 只认自己这个 iframe 的消息：postMessage 是窗口级广播，软导航残留的旧 iframe
  // 也能发到这里（用它判定本实例状态会误判）
  if (!iframe || event.source !== iframe.contentWindow) return
  const payload = event.data?.giscus
  if (!payload) return
  if (payload.error) {
    // 注意：giscus 把「该页面还没有讨论帖」也走 error 字段
    // （"Discussion not found. A new discussion will be created if a comment/reaction
    // is submitted."），而这是每篇新文章最正常的状态，所以此处只留日志不判失败
    // ——真故障（App 未授权、分类不存在）giscus 会在 iframe 内自己给出提示，
    // 控制台留原文供排查
    console.warn('[giscus]', payload.error)
  }
  // 收到本 iframe 的消息 = widget 已渲染，加载失败只剩「脚本没加载出来」一条路径
  settle('ready')
  pushTheme()
}

function inject() {
  const host = hostEl.value
  if (!host || injected) return
  injected = true
  // 运行时注入而非模板写死 <script>：ClientRouter 软导航后模板里的脚本不会重跑，
  // 评论区会在切换文章时静默消失
  const script = document.createElement('script')
  script.src = `${GISCUS_ORIGIN}/client.js`
  script.async = true
  script.crossOrigin = 'anonymous'
  // data-theme 已带上当前主题，故记录为「已推」——避免 widget 就绪后再推一次
  const theme = themeName()
  const attrs = {
    'data-repo': GISCUS.repo,
    'data-repo-id': GISCUS.repoId,
    'data-category': GISCUS.category,
    'data-category-id': GISCUS.categoryId,
    'data-mapping': GISCUS.mapping,
    'data-strict': GISCUS.strict,
    'data-input-position': GISCUS.inputPosition,
    'data-reactions-enabled': GISCUS.reactionsEnabled,
    'data-emit-metadata': GISCUS.emitMetadata,
    'data-lang': GISCUS.lang,
    'data-theme': theme
  }
  for (const [key, value] of Object.entries(attrs)) script.setAttribute(key, value)
  // client.js 本身取不到（giscus.app 不可达）时立刻给兜底文案，不用干等超时
  script.onerror = () => settle('failed')
  host.appendChild(script)
  pushedTheme = theme
  // 兜底：giscus.app 被墙/超时的场景下不能一直停在"正在加载"
  timer = setTimeout(() => settle('failed'), READY_TIMEOUT_MS)
}

onMounted(() => {
  // 懒加载：滚到评论区前 300px 才注入 client.js。读不到文末的访客全程
  // 零第三方请求——本站此前第三方域名请求为 0，这里把代价压到最小
  io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      io?.disconnect()
      io = null
      inject()
    },
    { rootMargin: '300px' }
  )
  io.observe(hostEl.value)

  window.addEventListener('message', onMessage)
  // 站点主题写的是 html[data-theme]（stores/ui.ts 的 setTheme），而各岛是独立
  // app 实例、pinia 不共享，直接观察该属性是这里唯一可靠的同步方式
  themeObserver = new MutationObserver(pushTheme)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  })
})

onUnmounted(() => {
  // ClientRouter 每次软导航都会重建本岛，监听器必须摘干净
  io?.disconnect()
  themeObserver?.disconnect()
  window.removeEventListener('message', onMessage)
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.comments-card {
  padding: 24px 28px;
  border-radius: 16px;
  /* 给 iframe 撑出空间，避免加载完成时的布局跳动 */
  min-height: 260px;
}

.comments-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border-divider);
  margin-bottom: 12px;
}

.comments-header .line {
  width: 4px;
  height: 18px;
  background: var(--color-primary);
  border-radius: 2px;
}

.comments-header h4 {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-weight: 600;
  color: var(--color-primary);
  font-size: 16px;
  margin: 0;
}

.comments-fallback {
  color: var(--color-primary);
  text-decoration: underline;
}

@media (max-width: 768px) {
  .comments-card {
    padding: 16px;
  }
}
</style>
