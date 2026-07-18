<template>
    <div class="home-layout">
        <header class="top-banner">
            <WelcomeBanner /> 
        </header>
        <aside class="left-sidebar">
            <PersonalCard />
            <Calendar />
        </aside>
        <main class="center">
            <PostList />
        </main>
        <aside class="right-sidebar">
            <MusicPlayer />
            <AnnouncementBoard />
        </aside>
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
.top-banner{
    grid-column: 1 / -1;
}
.home-layout {
  display: grid;
  grid-template-columns: 300px 640px 280px;
  gap: 20px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 76px 24px 40px;   /* 76 = 56navbar + 20间距 */
  min-height: 100vh;
}
/* 移动端暂时不管，后面再说 */
</style>