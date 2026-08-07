import { ref } from 'vue'
import { defineStore } from 'pinia'

const THEME_KEY = 'theme'
type Theme = 'light' | 'dark'

export const useUiStore = defineStore('ui', () => {
  const homeHeroCollapsed = ref(false)
  const theme = ref<Theme>((localStorage.getItem(THEME_KEY) as Theme) || 'light')

  function setHomeHeroCollapsed(value: boolean) {
    homeHeroCollapsed.value = value
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
