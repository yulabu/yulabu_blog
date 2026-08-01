<template>
  <header class="admin-header">
    <div class="header-right">
      <div class="user-info" @click="toggleDropdown">
        <img :src="avatarUrl" alt="avatar" class="user-avatar" />
        <span class="user-name">{{ currentAdmin.name || '管理员' }}</span>
        <Icon icon="material-symbols:expand-more" class="dropdown-icon" />
      </div>

      <div v-if="dropdownVisible" class="dropdown-menu" v-click-outside="closeDropdown">
        <button class="dropdown-item" @click="logout">
          <Icon icon="material-symbols:logout" class="dropdown-icon" />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const currentAdmin = computed(() => authStore.admin || {})

const avatarUrl = computed(() => {
  return currentAdmin.value.avatar || new URL('@/assets/img/Personal_img.jpg', import.meta.url).href
})

const dropdownVisible = ref(false)

function toggleDropdown() {
  dropdownVisible.value = !dropdownVisible.value
}

function closeDropdown() {
  dropdownVisible.value = false
}

function logout() {
  authStore.logout()
  router.push('/login')
}

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
.admin-header {
  position: fixed;
  top: 0;
  left: 220px;
  right: 0;
  height: 60px;
  z-index: 99;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 24px;
}

.header-right {
  position: relative;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.user-info:hover {
  background: rgba(var(--color-primary-rgb), 0.06);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
}

.user-name {
  font-size: 14px;
  color: var(--color-heading);
  font-weight: 500;
}

.dropdown-icon {
  font-size: 18px;
  color: var(--color-muted);
}

.dropdown-menu {
  position: absolute;
  top: 48px;
  right: 0;
  min-width: 140px;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 6px;
  z-index: 100;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.dropdown-item:hover {
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-heading);
}
</style>
