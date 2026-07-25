<template>
  <div class="welcome-card">
    <div class="left">
      <div class="greeting">{{ greeting }}</div>
      <div class="user">
        <span class="user-name">{{ adminName }}</span>
      </div>
    </div>

    <div class="right">
      <div class="time">{{ currentTime }}</div>
      <div class="date">{{ currentDateText }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  adminName: {
    type: String,
    default: '管理员'
  }
})

const currentTime = ref('')
let timer = null

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const currentDateText = computed(() => {
  const d = new Date()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  return `${year}年${month}月${date}日 ${weekdays[d.getDay()]}`
})

function updateTime() {
  const d = new Date()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  currentTime.value = `${h}:${m}:${s}`
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.welcome-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-top: 1px solid white;
  border-left: 1px solid white;
  background: linear-gradient(to right bottom,
      rgba(255, 255, 255, .6),
      rgba(255, 255, 255, .3),
      rgba(255, 255, 255, .2));
  backdrop-filter: blur(16px);
}

.left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.greeting {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 24px;
  font-weight: 600;
  color: rgb(45, 90, 65);
}

.user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-name {
  font-size: 16px;
  color: rgb(99, 149, 86);
  font-weight: 500;
}



.right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.time {
  font-family: 'Courier New', 'Microsoft YaHei', monospace;
  font-size: 36px;
  font-weight: 600;
  color: rgb(99, 149, 86);
  line-height: 1;
  letter-spacing: 2px;
}

.date {
  font-size: 14px;
  color: rgb(120, 140, 125);
}

@media (max-width: 600px) {
  .welcome-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .right {
    align-items: flex-start;
  }

  .time {
    font-size: 28px;
  }
}
</style>
