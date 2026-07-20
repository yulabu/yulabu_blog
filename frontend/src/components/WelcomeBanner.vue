<template>
  <div class="banner">
    <div class="bg"></div>
    <div class="content">
      <h1 class="title">欢迎来到鱼辣不的博客</h1>
    </div>
    <div class="waves">
      <div class="wave wave-1"></div>
      <div class="wave wave-2"></div>
      <div class="wave wave-3"></div>
      <div class="wave wave-4"></div>
    </div>
  </div>
</template>
<script setup>
</script>
<style scoped>
.banner {
  position: relative;
  width: 100%;
  height: 360px;
  overflow: hidden;
  border-radius: 5%;
}

.bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('../../assets/img/banner.jpg');
  background-size: cover;
  background-position: center;
  filter: brightness(0.75);
}

.content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
}

.title {
  font-family: '华文琥珀', 'STHupo', sans-serif;
  font-size: 42px;
  color: white;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
  margin: 0;
  letter-spacing: 4px;
  text-align: center;
}

.waves {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 140px;
  z-index: 3;
  pointer-events: none;
}

.wave {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 200%;
  height: 100%;
  background-repeat: repeat-x;
  background-position: 0 bottom;
  background-size: 50% 100%;
  animation: waveMove linear infinite;
}

.wave-1 {
  bottom: -20px;
  height: 140px;
  opacity: 0.35;
  animation-duration: 14s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,60 C150,120 350,0 600,60 C850,120 1050,0 1200,60 L1200,120 L0,120 Z' fill='%232d5a27'/%3E%3C/svg%3E");
}

.wave-2 {
  bottom: -10px;
  height: 120px;
  opacity: 0.45;
  animation-duration: 11s;
  animation-delay: -3s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,70 C200,10 400,130 600,70 C800,10 1000,130 1200,70 L1200,120 L0,120 Z' fill='%234a8b3c'/%3E%3C/svg%3E");
}

.wave-3 {
  bottom: 0;
  height: 100px;
  opacity: 0.55;
  animation-duration: 8s;
  animation-delay: -2s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,80 C250,140 450,20 600,80 C750,140 950,20 1200,80 L1200,120 L0,120 Z' fill='%2376c06a'/%3E%3C/svg%3E");
}

.wave-4 {
  bottom: 0;
  height: 80px;
  opacity: 0.9;
  animation-duration: 6s;
  animation-delay: -1s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,90 C180,30 420,150 600,90 C780,30 1020,150 1200,90 L1200,120 L0,120 Z' fill='%23caf2cb'/%3E%3C/svg%3E");
}

@keyframes waveMove {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
</style>