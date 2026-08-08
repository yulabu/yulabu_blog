<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import MessageBox from '@/components/common/MessageBox.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const isPageLoading = ref(false)

router.beforeEach(() => { isPageLoading.value = true })
router.afterEach(() => { isPageLoading.value = false })

onMounted(() => {
  authStore.hydrate()
  if (authStore.isLoggedIn) {
    authStore.refreshProfile().catch((e) => console.error('刷新管理员信息失败', e))
  }
})
</script>

<template>
    <LoadingOverlay :visible="isPageLoading" />
    <router-view />
    <MessageBox />
</template>
