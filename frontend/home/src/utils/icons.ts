import { addCollection } from '@iconify/vue'
import iconsData from '@/assets/icons.json'

// 离线图标注册：全站图标子集由 scripts/build-icons.mjs 从 @iconify-json/* 集合包
// 抽取生成（新增图标后跑 npm run icons）。注册后不再运行时请求 api.iconify.design
// ——消除 Edge Tracking Prevention 告警、外网依赖与图标首帧 pop-in；
// 服务端（Layout.astro 引入本模块）也能同步渲染出真 SVG。
// addCollection 按集合名幂等覆盖，模块可被多处安全引入。
for (const collection of Object.values(iconsData)) {
  addCollection(collection)
}
