<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useAnimatedCursor } from '@/composables/useAnimatedCursor'
import { useDayPeriod } from '@/composables/useDayPeriod'
import Navbar from '@/components/common/Navbar.vue'
import MusicPlayer from '@/components/common/MusicPlayer.vue'
import MessageBox from '@/components/common/MessageBox.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'
import TopProgressBar from '@/components/common/TopProgressBar.vue'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const { initCursors, setLoadingCursor, destroy } = useAnimatedCursor()
const { start: startDayPeriod, stop: stopDayPeriod } = useDayPeriod()

onMounted(() => {
  initCursors()
  startDayPeriod()
})

onUnmounted(() => {
  destroy()
  stopDayPeriod()
})

watch(() => uiStore.pageLoading, (loading) => {
  setLoadingCursor(loading)
})
const isHomeRoute = computed(() => route.name === 'Home')
const showNavbar = computed(() => {
  if (isHomeRoute.value && !uiStore.homeHeroCollapsed) return false
  return true
})

// 首页进入/刷新：加载遮罩与进度条由 HomeView 等待数据就绪后熄灭；
// 其他页面保持路由级即时亮灭（首页内 query 搜索导航不会误亮）
router.beforeEach((to) => {
  if (to.name !== 'Home') uiStore.setPageLoading(true)
})
router.afterEach((to) => {
  if (to.name !== 'Home') uiStore.setPageLoading(false)
})
</script>

<template>
    <Navbar v-if="showNavbar" />
    <TopProgressBar :loading="uiStore.pageLoading" />
    <LoadingOverlay :visible="uiStore.pageLoading" />
    <router-view />
    <MessageBox />
    <MusicPlayer />
</template>
