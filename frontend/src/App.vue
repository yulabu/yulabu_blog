<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import Navbar from '@/components/common/Navbar.vue'
import MessageBox from '@/components/common/MessageBox.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()
const isAdminRoute = computed(() => route.path.startsWith('/admin') || route.name === 'Login')
const isHomeRoute = computed(() => route.name === 'Home')
const showNavbar = computed(() => {
  if (isAdminRoute.value) return false
  if (isHomeRoute.value && !uiStore.homeHeroCollapsed) return false
  return true
})
const isPageLoading = ref(false)

router.beforeEach(() => { isPageLoading.value = true })
router.afterEach(() => { isPageLoading.value = false })

onMounted(() => {
  authStore.hydrate()
  if (isAdminRoute.value && authStore.isLoggedIn) {
    authStore.refreshProfile().catch((e) => console.error('刷新管理员信息失败', e))
  }
})
</script>

<template>
    <Navbar v-if="showNavbar" />
    <LoadingOverlay :visible="isPageLoading" />
    <router-view />
    <MessageBox />
</template>
