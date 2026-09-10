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
