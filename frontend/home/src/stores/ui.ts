import { ref, reactive } from 'vue'

const THEME_KEY = 'theme'
const HOME_HERO_COLLAPSED_KEY = 'homeHeroCollapsed'
type Theme = 'light' | 'dark'

// Astro SSR 渲染岛组件时无 window/localStorage，读取需降级
const hasWindow = typeof window !== 'undefined'

// 折叠状态用 sessionStorage：刷新保留（不弹全屏），关闭网站重开清空（重新弹出）
function getBooleanFromSession(key: string, defaultValue: boolean): boolean {
  if (!hasWindow) return defaultValue
  const raw = sessionStorage.getItem(key)
  return raw === null ? defaultValue : raw === 'true'
}

/**
 * 跨岛共享状态：**全部放模块作用域**（改前 theme 在模块级、homeHeroCollapsed 在 pinia 里，
 * 两种机制混在一个文件里）。各岛是独立 Vue app 实例、pinia 各注一份，而模块级 ref 是同一份
 * ESM 模块图的单例 —— 同页所有岛 import 到的是同一个 —— 与 stores/tagFilter.ts 同一套做法。
 *
 * 三分法（与 utils/、composables/ 的边界）：
 *   stores/      跨岛共享的**状态**（模块级单例，全页唯一）
 *   composables/ 组件/脚本级的**行为**（副作用与生命周期，无共享状态）：动画光标、昼夜属性
 *   utils/       纯函数（无副作用）
 *
 * 三条纪律（护栏脚本把守）：
 *   ① 只在客户端写：setTheme / setHomeHeroCollapsed 只由点击触发，SSR 期从不调用
 *   ② 模块顶层不许直接触碰 window/localStorage（这里是 typeof 守卫 + 函数内读取）
 *   ③ SSR 首帧不读：首帧主题由 Layout.astro 的内联脚本写在 html[data-theme] 上
 */

/** 主题按钮挂在 Navbar，消费方在别的岛（文章页 mdTheme 决定 md-editor 的暗色类） */
const theme = ref<Theme>(hasWindow ? ((localStorage.getItem(THEME_KEY) as Theme) || 'light') : 'light')

const homeHeroCollapsed = ref(getBooleanFromSession(HOME_HERO_COLLAPSED_KEY, false))

function setHomeHeroCollapsed(value: boolean) {
  homeHeroCollapsed.value = value
  if (!hasWindow) return
  sessionStorage.setItem(HOME_HERO_COLLAPSED_KEY, String(value))
  // 跨岛通信：Navbar 与 HomeHero 是不同 island，靠 DOM 事件同步折叠态
  window.dispatchEvent(new CustomEvent('yulabu:hero-collapsed', { detail: value }))
}

function setTheme(value: Theme) {
  theme.value = value
  if (!hasWindow) return
  localStorage.setItem(THEME_KEY, value)
  document.documentElement.setAttribute('data-theme', value)
}

function toggleTheme() {
  setTheme(theme.value === 'light' ? 'dark' : 'light')
}

// reactive 包装：模板里写 uiStore.theme 不需要 .value（与改前 pinia 的用法一致）
const uiStore = reactive({
  theme,
  homeHeroCollapsed,
  setTheme,
  toggleTheme,
  setHomeHeroCollapsed,
})

export function useUiStore() {
  return uiStore
}
