<template>
  <nav v-if="showNavbar" class="navbar" :class="{ scrolled: isScrolled }" v-click-outside="closeAll">
    <div class="nav-brand">
      <span class="logo">Yulabu</span>
    </div>
    <div class="nav-links" ref="navLinksRef">
      <a href="/" class="nav-link" :class="{ active: isActive('/') }">首页</a>
      <a href="/columns" class="nav-link" :class="{ active: isActive('/columns') }">专栏</a>
      <a href="/friends" class="nav-link" :class="{ active: isActive('/friends') }">友链</a>
      <a href="/archive" class="nav-link" :class="{ active: isActive('/archive') }">归档</a>
      <a href="/diary" class="nav-link" :class="{ active: isActive('/diary') }">日记</a>
      <a href="/about" class="nav-link" :class="{ active: isActive('/about') }">关于</a>
      <div class="nav-indicator" ref="indicatorRef"></div>
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
        <AppIcon icon="material-symbols:search" class="search-icon" />
      </button>
      <button class="theme-btn" @click="uiStore.toggleTheme">
        <AppIcon :icon="themeIcon" class="theme-icon" />
      </button>
      <button class="menu-btn" :class="{ active: isMenuOpen }" @click.stop="toggleMenu" aria-label="菜单">
        <AppIcon icon="material-symbols:menu" class="menu-icon" />
      </button>
    </div>
    <transition name="menu-fade">
      <div v-if="isMenuOpen" class="mobile-menu">
        <a href="/" class="mobile-link" :class="{ active: isActive('/') }" @click="closeMenu">首页</a>
        <a href="/columns" class="mobile-link" :class="{ active: isActive('/columns') }" @click="closeMenu">专栏</a>
        <a href="/friends" class="mobile-link" :class="{ active: isActive('/friends') }" @click="closeMenu">友链</a>
        <a href="/archive" class="mobile-link" :class="{ active: isActive('/archive') }" @click="closeMenu">归档</a>
        <a href="/diary" class="mobile-link" :class="{ active: isActive('/diary') }" @click="closeMenu">日记</a>
        <a href="/about" class="mobile-link" :class="{ active: isActive('/about') }" @click="closeMenu">关于</a>
      </div>
    </transition>
  </nav>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { navigate } from 'astro:transitions/client'
import AppIcon from '@/components/common/AppIcon.vue'
import { useUiStore } from '@/stores/ui'

const props = defineProps({
  currentPath: {
    type: String,
    default: '/'
  }
})

const isScrolled = ref(false)
const BANNER_HEIGHT = 360
const NAVBAR_HEIGHT = 56
const THRESHOLD = BANNER_HEIGHT - NAVBAR_HEIGHT
const navLinksRef = ref(null)
const indicatorRef = ref(null)

const uiStore = useUiStore()
// 水合稳态初值：SSR 与客户端首帧渲染必须一致，客户端专属状态（URL query、
// sessionStorage、当前主题）统一在 onMounted 里同步，避免 Hydration mismatch
const searchInput = ref('')
const isSearchOpen = ref(false)
const isMenuOpen = ref(false)
const searchInputRef = ref(null)

// 挂载前渲染空图标与 SSR 一致，挂载后按当前主题显示（暗色用户首帧不 mismatch）
const isMounted = ref(false)
const themeIcon = computed(() => {
  if (!isMounted.value) return ''
  return uiStore.theme === 'light' ? 'material-symbols:dark-mode' : 'material-symbols:light-mode'
})

// 首页桌面端等 Hero 折叠后才显示导航栏（折叠态经 yulabu:hero-collapsed 事件跨岛同步）
const HERO_KEY = 'homeHeroCollapsed'
const heroCollapsed = ref(false)
const isMobile = ref(false)
let mql = null

function readHeroCollapsed() {
  try {
    return sessionStorage.getItem(HERO_KEY) === 'true'
  } catch {
    return false
  }
}

function onHeroCollapsed(e) {
  heroCollapsed.value = !!e.detail
}

function updateMobile() {
  isMobile.value = mql?.matches ?? false
}

function updateMql() {
  mql = window.matchMedia('(max-width: 768px)')
  updateMobile()
  mql.addEventListener('change', updateMobile)
}

// 首页进入/刷新：加载遮罩与进度条由 HomeView 等待数据就绪后熄灭；
const showNavbar = computed(() => {
  if (props.currentPath === '/' && !isMobile.value && !heroCollapsed.value) return false
  return true
})

function isActive(to) {
  if (to === '/') return props.currentPath === '/'
  return props.currentPath.startsWith(to)
}

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

function updateIndicator() {
  if (!navLinksRef.value || !indicatorRef.value) return
  const active = navLinksRef.value.querySelector('.nav-link.active')
  if (!active) {
    indicatorRef.value.style.opacity = '0'
    return
  }
  indicatorRef.value.style.opacity = '1'
  indicatorRef.value.style.left = `${active.offsetLeft}px`
  indicatorRef.value.style.width = `${active.offsetWidth}px`
}

function onSearch() {
  const q = searchInput.value.trim().slice(0, 32)
  navigate(q ? `/?q=${encodeURIComponent(q)}` : '/')
  closeSearch()
}

onMounted(() => {
  isMounted.value = true
  updateMql()
  // 同步客户端专属状态（此时 SSR 首帧已渲染完毕，更新不再触发水合 mismatch）
  const q = new URLSearchParams(window.location.search).get('q')
  if (q) searchInput.value = q
  heroCollapsed.value = readHeroCollapsed()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('yulabu:hero-collapsed', onHeroCollapsed)
  handleScroll()
  nextTick(updateIndicator)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('yulabu:hero-collapsed', onHeroCollapsed)
  mql?.removeEventListener('change', updateMobile)
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
  position: relative;
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

.nav-link.active {
  color: var(--color-primary);
  font-weight: 900;
}

.nav-indicator {
  position: absolute;
  bottom: 0;
  height: 2px;
  background: rgb(99, 149, 86);
  border-radius: 1px;
  transition: left 0.3s ease, width 0.3s ease, opacity 0.2s ease;
  pointer-events: none;
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
.mobile-menu .mobile-link.active {
  color: var(--color-primary);
  background: rgba(99, 149, 86, 0.08);
}

@media (max-width: 768px) {
  .navbar {
    position: sticky;
    top: 0;
    padding: 0 16px;
    background: var(--navbar-bg);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--navbar-border);
    box-shadow: 0 4px 12px var(--shadow-color);
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