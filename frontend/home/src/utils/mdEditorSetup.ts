// md-editor-v3 全局配置：把内部扩展依赖替换为本地实例，根除运行时 unpkg.com 外链
// （该域被 Edge 列入跟踪器名单，每次整页加载文章都注入外链并触发
// Tracking Prevention 存储访问告警）。必须在任何 MdPreview 挂载前执行——
// _app.ts（客户端）与 Layout.astro（服务端 SSR，正文代码块同步高亮）都引入本模块。
import { config } from 'md-editor-v3'
import hljs from 'highlight.js/lib/common'
import githubCss from 'highlight.js/styles/github.css?url'
import atomOneDarkCss from 'highlight.js/styles/atom-one-dark.css?url'

config({
  editorExtensions: {
    highlight: {
      instance: hljs,
      // 代码主题样式指向本地构建产物（默认从 unpkg 拉 github/atomOneDark 两套）
      css: {
        github: { light: githubCss, dark: githubCss },
        atomOneDark: { light: atomOneDarkCss, dark: atomOneDarkCss },
      },
    },
  },
})

// md-editor 自带的 highlight 样式注入/切换在「显式传了 instance」时会被整体跳过
// （源码 lib/es/chunks/index4.mjs 的 `noHighlight || instance.value || 注入 link`），
// 所以上面那份 css 配置永远不会生效——代码块没有 hljs 配色，切主题也不会换色。
// 传 instance 是必须的（去掉它 md-editor 会去注入 unpkg 的 highlight.js script，
// 破坏站点零第三方外链的约定），因此由我们自己管这个 <link>。
const HLJS_LINK_ID = 'md-editor-hlCss' // 与库内部常量同名：将来库再注入时是替换而非重复

/** 按主题切换代码块配色；重复调用幂等（href 相同不触碰 DOM） */
export function applyHljsCss(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return
  const href = theme === 'dark' ? atomOneDarkCss : githubCss
  let link = document.getElementById(HLJS_LINK_ID) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = HLJS_LINK_ID
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  if (link.getAttribute('href') !== href) link.setAttribute('href', href)
}
