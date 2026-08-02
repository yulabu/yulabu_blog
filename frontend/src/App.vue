<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Navbar from '@/components/common/Navbar.vue'
import MessageBox from '@/components/common/MessageBox.vue'

const route = useRoute()
const authStore = useAuthStore()
const isAdminRoute = computed(() => route.path.startsWith('/admin') || route.name === 'Login')

onMounted(() => {
  authStore.hydrate()
  if (isAdminRoute.value && authStore.isLoggedIn) {
    authStore.refreshProfile().catch((e) => console.error('刷新管理员信息失败', e))
  }
})
</script>

<template>
    <Navbar v-if="!isAdminRoute" />
    <router-view />
    <MessageBox />
</template>
