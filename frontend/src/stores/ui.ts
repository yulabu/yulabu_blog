import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', () => {
  const homeHeroCollapsed = ref(false)

  function setHomeHeroCollapsed(value: boolean) {
    homeHeroCollapsed.value = value
  }

  return {
    homeHeroCollapsed,
    setHomeHeroCollapsed
  }
})
