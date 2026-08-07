<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Navbar from '@/components/common/Navbar.vue'
import MessageBox from '@/components/common/MessageBox.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const isAdminRoute = computed(() => route.path.startsWith('/admin') || route.name === 'Login')
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
    <Navbar v-if="!isAdminRoute" />
    <LoadingOverlay :visible="isPageLoading" />
    <router-view />
    <MessageBox />
</template>
