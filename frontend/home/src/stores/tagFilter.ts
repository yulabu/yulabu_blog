import { ref } from 'vue'

/**
 * 标签筛选的跨岛共享状态。
 *
 * **为什么不用 pinia**：pinia 经 @astrojs/vue 的 appEntrypoint 注入，但每个岛是
 * 独立的 Vue app 实例，store 各注一份、互不同步（见 AGENTS.md「跨岛状态」）。
 * 而模块级 ref 是同一份 ESM 模块图的单例 —— 同页所有岛 import 到的是同一个 ref，
 * 所以能直接联通，不需要再绕 DOM 事件。
 *
 * 用途：首页的标签筛选挂在页面骨架的左栏（常驻卡片下方，PageFrame 的 rail 槽），
 * 与中栏的 PostList 分属不同岛，靠这个 ref 联通；归档页不使用它。
 */
export const activeTagId = ref<number | null>(null)

/** 再点一次同一个标签＝取消筛选 */
export function toggleActiveTag(id: number | null) {
  activeTagId.value = activeTagId.value === id ? null : id
}

export function clearActiveTag() {
  activeTagId.value = null
}
