import './_vue-flags'
import '@/utils/icons'
import type { App as VueApp } from 'vue'
import { createPinia } from 'pinia'

// @astrojs/vue appEntrypoint：每个 Vue island 是独立的 app 实例，
// 在这里统一安装 pinia（替代原 SPA main.ts 的 app.use(pinia)）。
// 注意 _vue-flags 必须先于 pinia 导入（原因见该文件注释）。
//
// 这里**不再**引 @/utils/mdEditorSetup：它会把 highlight.js（约 153 KB）与
// md-editor-v3 的 config 一起塞进每个页面都要加载的 appEntrypoint 包（实测
// _app.js 194 KB / gzip 68 KB，占首页 JS 397 KB 的一半），而只有文章页渲染
// Markdown。改由 PostDetailView.vue 自己引入（SSR 侧仍由 Layout.astro 引入）。
export default function (App: VueApp) {
  App.use(createPinia())
}
