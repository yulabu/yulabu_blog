import '@/utils/icons'
import type { App as VueApp } from 'vue'

// @astrojs/vue 的 appEntrypoint：每个 Vue island 是独立 app 实例，这里做「每个岛都要有」的初始化。
//
// 现在只剩一件事：客户端侧注册离线图标子集（AppIcon 同步渲染 getIcon 的 body；
// SSR 侧由 Layout.astro 引入同一份注册表）。
//
// 这里**不再**做三件旧事：
//   · 安装 pinia —— 跨岛共享改用 stores/ 的模块级单例（各岛各注一份 pinia 本来就不同步）
//   · import './_vue-flags' —— 那份特性开关是为 pinia 的 ESM 包补的全局，随 pinia 一起删除
//   · 引 @/utils/mdEditorSetup —— 它会把这个岛用不到的重依赖塞进每页都加载的入口包
//     （实测 _app.js 194 KB / gzip 68 KB），文章页自己引（见 PostDetailView.vue）
export default function (_App: VueApp) {}
