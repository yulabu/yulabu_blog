import './_vue-flags'
import '@/utils/icons'
import '@/utils/mdEditorSetup'
import type { App as VueApp } from 'vue'
import { createPinia } from 'pinia'

// @astrojs/vue appEntrypoint：每个 Vue island 是独立的 app 实例，
// 在这里统一安装 pinia（替代原 SPA main.ts 的 app.use(pinia)）。
// 注意 _vue-flags 必须先于 pinia 导入（原因见该文件注释）。
export default function (App: VueApp) {
  App.use(createPinia())
}
