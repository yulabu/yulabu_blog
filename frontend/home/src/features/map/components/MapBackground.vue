<template>
  <g class="map-background">
    <!-- 水域基底 -->
    <rect
      x="-200"
      y="-200"
      width="2400"
      height="1600"
      rx="300"
      class="water"
    />

    <!-- 装饰性小岛群（不可交互） -->
    <g class="decoration-islands">
      <path d="M300,200 C330,180 370,190 390,220 C410,250 390,290 350,300 C310,310 270,280 260,240 C250,210 270,190 300,200" class="deco-island" />
      <path d="M1600,180 C1650,160 1710,190 1730,240 C1750,290 1710,340 1650,350 C1590,360 1530,320 1520,260 C1510,210 1550,180 1600,180" class="deco-island" />
      <path d="M200,750 C240,730 290,750 310,790 C330,830 300,880 250,890 C200,900 150,870 140,820 C130,780 160,750 200,750" class="deco-island" />
      <path d="M1750,850 C1790,830 1840,860 1860,910 C1880,960 1830,1000 1770,1010 C1710,1020 1660,980 1650,920 C1640,870 1700,850 1750,850" class="deco-island" />
      <path d="M980,150 C1010,130 1050,150 1060,190 C1070,230 1040,260 1000,270 C960,280 920,250 910,210 C900,170 940,140 980,150" class="deco-island" />
      <path d="M100,1050 C140,1030 190,1060 210,1100 C230,1140 190,1190 140,1200 C90,1210 40,1170 30,1120 C20,1070 60,1040 100,1050" class="deco-island" />
      <path d="M1900,600 C1940,580 1980,610 1990,660 C2000,710 1960,750 1900,760 C1840,770 1790,730 1780,670 C1770,610 1840,590 1900,600" class="deco-island" />
    </g>

    <!-- 漂浮的 "树叶/花瓣" 装饰 -->
    <g class="floating-particles">
      <circle cx="420" cy="460" r="6" class="particle p1" />
      <circle cx="1580" cy="520" r="5" class="particle p2" />
      <circle cx="700" cy="980" r="7" class="particle p3" />
      <circle cx="1300" cy="720" r="5" class="particle p4" />
      <circle cx="850" cy="180" r="6" class="particle p5" />
      <circle cx="1450" cy="950" r="4" class="particle p1" />
      <circle cx="250" cy="600" r="5" class="particle p3" />
    </g>

    <!-- 航道/虚线 -->
    <g class="routes">
      <path d="M1000,620 C900,520 750,420 620,320" class="route-line" />
      <path d="M1000,620 C1180,520 1320,440 1460,360" class="route-line" />
      <path d="M1000,620 C820,720 650,780 520,820" class="route-line" />
      <path d="M1000,620 C1060,720 1120,800 1180,880" class="route-line" />
    </g>
  </g>
</template>

<style scoped>
.map-background {
  pointer-events: none;
}

.water {
  fill: var(--bg-card);
  opacity: 0.5;
}

.deco-island {
  fill: var(--bg-card-strong);
  opacity: 0.35;
}

.particle {
  fill: var(--color-primary);
  opacity: 0.25;
}

.route-line {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 2;
  stroke-dasharray: 8 10;
  opacity: 0.2;
}

.floating-particles .p1 {
  animation: float 5s ease-in-out infinite;
}
.floating-particles .p2 {
  animation: float 6s ease-in-out infinite 1s;
}
.floating-particles .p3 {
  animation: float 4.5s ease-in-out infinite 0.5s;
}
.floating-particles .p4 {
  animation: float 5.5s ease-in-out infinite 1.5s;
}
.floating-particles .p5 {
  animation: float 4s ease-in-out infinite 2s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>
