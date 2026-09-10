// 文章过渡卡片：点击瞬间的跨页弹卡信号。
// 写入方（文章列表 / 归档 / 专栏目录 / 上下篇的点击）把整条目挂到 window 并广播
// 'yulabu:post-splash' 事件；读取方是常驻岛 PostSplash.vue（transition:persist
// 跨页存活，接收事件立即弹出）。
// 用 window 而非 sessionStorage：ClientRouter 软导航只换 document 内容、
// 不销毁 window，同一 JS 堆内必然可达；直接访问 / 刷新 / 分享链接 /
// 爬虫没有点击事件，卡片永不出现。
declare global {
  interface Window {
    __yulabuSplash?: {
      id: number | string
      title: string
      cover: string | null
      summary: string | null
      t0: number
    } | null
  }
}

const SPLASH_EVENT = 'yulabu:post-splash'

export function markPostSplash(post: {
  id: number | string
  title?: string
  cover?: string | null
  summary?: string | null
}) {
  const payload = {
    id: post.id,
    title: post.title || '',
    cover: post.cover || null,
    summary: post.summary || null,
    t0: Date.now(),
  }
  window.__yulabuSplash = payload
  window.dispatchEvent(new CustomEvent(SPLASH_EVENT, { detail: payload }))
}
