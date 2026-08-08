<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import Navbar from '@/components/common/Navbar.vue'
import MessageBox from '@/components/common/MessageBox.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const isHomeRoute = computed(() => route.name === 'Home')
const showNavbar = computed(() => {
  if (isHomeRoute.value && !uiStore.homeHeroCollapsed) return false
  return true
})
const isPageLoading = ref(false)

router.beforeEach(() => { isPageLoading.value = true })
router.afterEach(() => { isPageLoading.value = false })
</script>

<template>
    <Navbar v-if="showNavbar" />
    <LoadingOverlay :visible="isPageLoading" />
    <router-view />
    <MessageBox />
</template>
