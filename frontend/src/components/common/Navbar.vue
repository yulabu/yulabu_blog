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

  </nav>
</template>
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isScrolled = ref(false)
const BANNER_HEIGHT = 360
const NAVBAR_HEIGHT = 56
const THRESHOLD = BANNER_HEIGHT - NAVBAR_HEIGHT

function handleScroll() {
  isScrolled.value = window.scrollY > THRESHOLD
}

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
  color: rgb(99, 149, 86);
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
  color: rgb(65, 110, 105);
  text-decoration: none;
  padding: 6px 0;
  position: relative;
  transition: color .2s;
}

.nav-link:hover {
  color: rgb(99, 149, 86);
}

.nav-link.router-link-active {
  color: rgb(99, 149, 86);
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

</style>