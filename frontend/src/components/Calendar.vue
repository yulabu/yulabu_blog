<template>
  <div class="card">
    <div class="header">{{ year }}年 {{ month + 1 }}月</div>
    <div class="weekdays">
      <span v-for="d in weekLabels" :key="d">{{ d }}</span>
    </div>
    <div class="grid">
      <span
        v-for="(day, i) in calendar"
        :key="i"
        :class="{ today: day === today }"
      >{{ day ?? '' }}</span>
    </div>
  </div>
</template>
<style scoped>
.card{
    width: 200px;
    height: 200px;
    background-color: aqua;
}
</style>
<script setup>
// 时间尚未实现
</script>