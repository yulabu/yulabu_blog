import { ref } from 'vue'
import { defineStore } from 'pinia'

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
 * 主题是**跨岛共享状态**，所以 ref 放在模块作用域而非 store 内部。
 *
 * 各岛是独立 Vue app 实例、pinia 各注一份（见 AGENTS.md「跨岛状态」），主题按钮挂在
 * Navbar、消费方却在别的岛（PostDetailView 的 mdTheme 决定 md-editor 的 dark 类），
 * 若把 ref 关在 store 里，切主题只改 Navbar 那一份，文章页正文样式永不跟随（实踩：
 * 切主题后正文不跟随、强刷才恢复）。模块级 ref 是同一份 ESM 模块图的单例，同页所有岛
 * import 到的是同一个 ref —— 与 stores/tagFilter.ts 同一套做法。
 *
 * SSR 安全：服务端只初始化成 'light' 且从不调用 setTheme（只由点击触发），各岛 SSR
 * 首帧也不读它，不会跨请求串状态。
 */
const theme = ref<Theme>(hasWindow ? ((localStorage.getItem(THEME_KEY) as Theme) || 'light') : 'light')

export const useUiStore = defineStore('ui', () => {
  const homeHeroCollapsed = ref(getBooleanFromSession(HOME_HERO_COLLAPSED_KEY, false))

  function setHomeHeroCollapsed(value: boolean) {
    homeHeroCollapsed.value = value
    if (!hasWindow) return
    sessionStorage.setItem(HOME_HERO_COLLAPSED_KEY, String(value))
    // 跨岛通信：Navbar 与 HomeHero 是不同 island、不共享 pinia，靠 DOM 事件同步折叠态
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

  return {
    homeHeroCollapsed,
    setHomeHeroCollapsed,
    theme,
    setTheme,
    toggleTheme
  }
})
