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

export const useUiStore = defineStore('ui', () => {
  const homeHeroCollapsed = ref(getBooleanFromSession(HOME_HERO_COLLAPSED_KEY, false))
  const theme = ref<Theme>(hasWindow ? ((localStorage.getItem(THEME_KEY) as Theme) || 'light') : 'light')

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
