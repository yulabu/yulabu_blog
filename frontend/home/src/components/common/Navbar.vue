<template>
  <nav class="navbar" :class="{ scrolled: isScrolled }" v-click-outside="closeAll">
    <div class="nav-brand">
      <span class="logo">Yulabu</span>
    </div>
    <div class="nav-links">
      <router-link to="/" class="nav-link">首页</router-link>
      <router-link to="/friends" class="nav-link">友链</router-link>
      <router-link to="/archive" class="nav-link">归档</router-link>
      <a href="#" class="nav-link" @click.prevent>碎碎念</a>
      <router-link to="/about" class="nav-link">关于</router-link>
    </div>
    <div class="nav-search">
      <input
        ref="searchInputRef"
        v-model="searchInput"
        type="text"
        class="search-input"
        :class="{ open: isSearchOpen }"
        placeholder="搜索文章..."
        @keyup.enter="onSearch"
      />
      <button v-if="!isSearchOpen" class="search-btn" @click.stop="openSearch">
        <Icon icon="material-symbols:search" class="search-icon" />
      </button>
      <button class="theme-btn" @click="uiStore.toggleTheme">
        <Icon :icon="themeIcon" class="theme-icon" />
      </button>
      <button class="menu-btn" :class="{ active: isMenuOpen }" @click.stop="toggleMenu" aria-label="菜单">
        <Icon icon="material-symbols:menu" class="menu-icon" />
      </button>
    </div>
    <transition name="menu-fade">
      <div v-if="isMenuOpen" class="mobile-menu">
        <router-link to="/" class="mobile-link" @click="closeMenu">首页</router-link>
        <router-link to="/friends" class="mobile-link" @click="closeMenu">友链</router-link>
        <router-link to="/archive" class="mobile-link" @click="closeMenu">归档</router-link>
        <a href="#" class="mobile-link" @click.prevent="closeMenu">碎碎念</a>
        <router-link to="/about" class="mobile-link" @click="closeMenu">关于</router-link>
      </div>
    </transition>
  </nav>
</template>
<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/stores/ui'

const isScrolled = ref(false)
const BANNER_HEIGHT = 360
const NAVBAR_HEIGHT = 56
const THRESHOLD = BANNER_HEIGHT - NAVBAR_HEIGHT

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const searchInput = ref('')
const isSearchOpen = ref(false)
const isMenuOpen = ref(false)
const searchInputRef = ref(null)

const themeIcon = computed(() => uiStore.theme === 'light' ? 'material-symbols:dark-mode' : 'material-symbols:light-mode')

function handleScroll() {
  isScrolled.value = window.scrollY > THRESHOLD
}

function openSearch() {
  isSearchOpen.value = true
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

function closeSearch() {
  isSearchOpen.value = false
}

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

function closeMenu() {
  isMenuOpen.value = false
}

function closeAll() {
  closeMenu()
  closeSearch()
}

function onSearch() {
  const q = searchInput.value.trim().slice(0, 32)
  if (q) {
    router.push({ name: 'Home', query: { ...route.query, q } })
  } else {
    const { q: _, ...rest } = route.query
    router.push({ name: 'Home', query: rest })
  }
  closeSearch()
}

watch(() => route.query.q, (val) => {
  searchInput.value = val ? String(val) : ''
}, { immediate: true })

watch(() => route.path, () => {
  closeMenu()
  closeSearch()
})

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (e) => {
      if (!(el === e.target || el.contains(e.target))) {
        binding.value()
      }
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside)
  }
}
</script>
<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: transparent;
  border-bottom: 1px solid transparent;
  box-shadow: none;
  transition: background .3s, border-color .3s, box-shadow .3s;
}

.navbar.scrolled {
  background: var(--navbar-bg);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--navbar-border);
  box-shadow: 0 4px 12px var(--shadow-color);
}

.nav-brand {
  display: flex;
  align-items: center;
}

.logo {
  font-family: '华文琥珀', 'STHupo', sans-serif;
  font-size: 24px;
  color: var(--color-primary);
  letter-spacing: 2px;
  cursor: pointer;
  transition: color .2s;
}

.logo:hover {
  color: rgb(71, 120, 65);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 28px;
}

.nav-link {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 16px;
  color: rgb(80, 90, 85);
  text-decoration: none;
  padding: 6px 0;
  position: relative;
  transition: color .2s;
}

.nav-link:hover {
  color: var(--color-primary);
}

.nav-link.router-link-active {
  color: var(--color-primary);
  font-weight: 900;
}

.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: rgb(99, 149, 86);
  border-radius: 1px;
}

.nav-search {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  width: 240px;
  flex-shrink: 0;
}

.search-input {
  width: 0;
  padding: 0;
  border: none;
  border-radius: 20px;
  background: var(--bg-card);
  color: var(--color-text);
  font-size: 13px;
  outline: none;
  overflow: hidden;
  opacity: 0;
  transition: width 0.3s ease, opacity 0.3s ease, padding 0.3s ease, border-color 0.3s ease;
}

.search-input.open {
  width: 160px;
  padding: 6px 12px;
  border: 1px solid var(--border-light);
  opacity: 1;
}

.search-input.open:focus {
  width: 200px;
  background: var(--bg-card-strong);
  border-color: rgba(var(--color-primary-rgb), 0.4);
}

.search-input::placeholder {
  color: var(--color-muted);
}

.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(99, 149, 86, 0.15);
  color: var(--color-primary);
  cursor: pointer;
  transition: background 0.2s ease;
  padding: 0;
}

.search-btn:hover {
  background: rgba(99, 149, 86, 0.3);
}

.search-icon {
  font-size: 16px;
}

.theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(99, 149, 86, 0.15);
  color: var(--color-primary);
  cursor: pointer;
  transition: background 0.2s ease;
  padding: 0;
}

.theme-btn:hover {
  background: rgba(99, 149, 86, 0.3);
}

.theme-icon {
  font-size: 16px;
}

.menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(99, 149, 86, 0.15);
  color: var(--color-primary);
  cursor: pointer;
  transition: background 0.2s ease;
  padding: 0;
}

.menu-btn:hover,
.menu-btn.active {
  background: rgba(99, 149, 86, 0.3);
}

.menu-icon {
  font-size: 18px;
}

.mobile-menu {
  display: none;
}

.mobile-menu .mobile-link {
  display: block;
  padding: 14px 32px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 16px;
  color: rgb(80, 90, 85);
  text-decoration: none;
  transition: color 0.2s, background 0.2s;
  border-bottom: 1px solid var(--border-divider);
}

.mobile-menu .mobile-link:hover,
.mobile-menu .mobile-link.router-link-active {
  color: var(--color-primary);
  background: rgba(99, 149, 86, 0.08);
}

@media (max-width: 768px) {
  .navbar {
    padding: 0 16px;
  }

  .nav-links {
    display: none;
  }

  .nav-search {
    width: auto;
  }

  .menu-btn {
    display: flex;
  }

  .mobile-menu {
    display: block;
    position: fixed;
    top: 56px;
    left: 0;
    right: 0;
    z-index: 999;
    background: var(--navbar-bg);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--navbar-border);
    box-shadow: 0 8px 20px var(--shadow-color);
  }
}

@media (max-width: 480px) {
  .search-input.open {
    width: 130px;
  }

  .search-input.open:focus {
    width: 150px;
  }
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

</style>