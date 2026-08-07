import { ref } from 'vue'
import { defineStore } from 'pinia'

const THEME_KEY = 'theme'
const HOME_HERO_COLLAPSED_KEY = 'homeHeroCollapsed'
type Theme = 'light' | 'dark'

function getBooleanFromStorage(key: string, defaultValue: boolean): boolean {
  const raw = localStorage.getItem(key)
  return raw === null ? defaultValue : raw === 'true'
}

export const useUiStore = defineStore('ui', () => {
  const homeHeroCollapsed = ref(getBooleanFromStorage(HOME_HERO_COLLAPSED_KEY, false))
  const theme = ref<Theme>((localStorage.getItem(THEME_KEY) as Theme) || 'light')

  function setHomeHeroCollapsed(value: boolean) {
    homeHeroCollapsed.value = value
    localStorage.setItem(HOME_HERO_COLLAPSED_KEY, String(value))
  }

  function setTheme(value: Theme) {
    theme.value = value
    localStorage.setItem(THEME_KEY, value)
    document.documentElement.setAttribute('data-theme', value)
  }

  function toggleTheme() {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  function initTheme() {
    document.documentElement.setAttribute('data-theme', theme.value)
  }

  return {
    homeHeroCollapsed,
    setHomeHeroCollapsed,
    theme,
    setTheme,
    toggleTheme,
    initTheme
  }
})
