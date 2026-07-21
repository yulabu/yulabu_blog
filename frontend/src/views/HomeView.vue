<template>
    <div class="page-bg">
        <header class="top-banner">
            <WelcomeBanner /> 
        </header>
        <div class="home-layout">
            <aside class="left-sidebar">
                <PersonalCard />
            </aside>
            <main class="center">
                <PostList />
            </main>
            <aside class="right-sidebar">
                <AnnouncementBoard />
                <MusicPlayer />
            </aside>
        </div>  
    </div>
    
</template>
<script setup>
import PersonalCard from '@/components/PersonalCard.vue';
import Calendar from '@/components/Calendar.vue';
import WelcomeBanner from '@/components/WelcomeBanner.vue';
import PostList from '@/components/PostList.vue';
import MusicPlayer from '@/components/MusicPlayer.vue';
import AnnouncementBoard from '@/components/AnnouncementBoard.vue';
</script>
<style scoped>
    .page-bg{
        width: 100%;
        min-height: 100vh;
        background-color: rgb(202, 242, 203);
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
}
/* 移动端暂时不管，后面再说 */
</style>