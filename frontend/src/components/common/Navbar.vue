<template>
  <nav class="navbar" :class="{ scrolled: isScrolled }">
    <div class="nav-brand">
      <span class="logo">Yulabu</span>
    </div>
    <div class="nav-links">
      <router-link to="/" class="nav-link">首页</router-link>
      <router-link to="/articles" class="nav-link">文章</router-link>
      <router-link to="/about" class="nav-link">关于</router-link>
    </div>
    <div class="nav-search">
      <input
        v-model="searchInput"
        type="text"
        class="search-input"
        placeholder="搜索文章..."
        @keyup.enter="onSearch"
      />
      <button class="search-btn" @click="onSearch">
        <Icon icon="material-symbols:search" class="search-icon" />
      </button>
    </div>
  </nav>
</template>
<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

const isScrolled = ref(false)
const BANNER_HEIGHT = 360
const NAVBAR_HEIGHT = 56
const THRESHOLD = BANNER_HEIGHT - NAVBAR_HEIGHT

const route = useRoute()
const router = useRouter()
const searchInput = ref('')

function handleScroll() {
  isScrolled.value = window.scrollY > THRESHOLD
}

function onSearch() {
  const q = searchInput.value.trim().slice(0, 32)
  if (q) {
    router.push({ name: 'Home', query: { ...route.query, q } })
  } else {
    const { q: _, ...rest } = route.query
    router.push({ name: 'Home', query: rest })
  }
}

watch(() => route.query.q, (val) => {
  searchInput.value = val ? String(val) : ''
}, { immediate: true })

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
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
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
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
  font-family: '微软雅黑', sans-serif;
  font-size: 14px;
  color: var(--color-text);
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
  gap: 6px;
}

.search-input {
  width: 160px;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.25);
  color: var(--color-text);
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  width: 200px;
  background: rgba(255, 255, 255, 0.55);
  border-color: rgba(99, 149, 86, 0.4);
}

.search-input::placeholder {
  color: rgba(80, 100, 90, 0.6);
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

</style>