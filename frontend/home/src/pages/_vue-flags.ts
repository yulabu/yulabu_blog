// pinia 的 dist 以裸标识符引用 Vue 特性开关（__VUE_PROD_DEVTOOLS__ 等）。
// Astro SSR 下 pinia 以 external 方式直接从 node_modules 加载、未经打包器 define 替换，
// 必须在 pinia 模块求值前把开关挂到 globalThis，否则 createPinia 抛 ReferenceError。
// 本文件必须 _app.ts 中先于 pinia 导入（ESM 静态导入顺序保证）。
const g = globalThis as Record<string, unknown>

g.__VUE_OPTIONS_API__ ??= true
g.__VUE_PROD_DEVTOOLS__ ??= false
g.__VUE_PROD_HYDRATION_MISMATCH_DETAILS__ ??= false

export {}
