<template>
    <div class="page-bg">
        <header class="top-banner">
            <HomeHero /> 
        </header>
        <div class="home-layout">
            <aside class="left-sidebar">
                <PersonalCard />
                <TagBox :active-id="activeCategoryId" @select="onTagSelect" />
            </aside>
            <main class="center">
                <PostList :category-id="activeCategoryId" :search-query="searchQuery" @clear="onClear" />
            </main>
            <aside class="right-sidebar">
                <AnnouncementBoard />
                <MusicPlayer />
            </aside>
        </div>  
    </div>
    
</template>
<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PersonalCard from '@/components/home/PersonalCard.vue';
import TagBox from '@/components/home/TagBox.vue';
import HomeHero from '@/components/home/HomeHero.vue';
import PostList from '@/components/home/PostList.vue';
import MusicPlayer from '@/components/home/MusicPlayer.vue';
import AnnouncementBoard from '@/components/home/AnnouncementBoard.vue';

const route = useRoute()
const router = useRouter()

const activeCategoryId = ref(null)
const searchQuery = computed(() => (route.query.q ? String(route.query.q) : ''))

function onTagSelect(id) {
  activeCategoryId.value = id
}

function onClear() {
  activeCategoryId.value = null
  if (route.query.q) {
    router.push({ name: 'Home' })
  }
}
</script>
<style scoped>
    .page-bg{
        width: 100%;
        min-height: 100vh;
        background-color: var(--bg-page);
    }
    .top-banner{
        width: 100%;
    }
    .home-layout {
    display: grid;
    grid-template-columns: 300px 640px 280px;
    gap: 20px;
    max-width: 1280px;
    margin: 0 auto;
    padding: 20px 24px 40px;
    min-height: 100vh;
    }
.left-sidebar,
.right-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: 96px;
  align-self: start;
}
/* 移动端暂时不管，后面再说 */
</style>