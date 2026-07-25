<template>
  <div class="card">
    <header>
      <div class="day">{{ selectedDate.getDate() }}</div>
      <div class="month-year">
        <div class="month">{{ monthName }} {{ currentYear }}</div>
        <div class="nav">
          <button class="nav-btn" @click="prevMonth" aria-label="Previous month">
            <Icon icon="material-symbols:chevron-left" />
          </button>
          <button class="nav-btn today" @click="goToday">Today</button>
          <button class="nav-btn" @click="nextMonth" aria-label="Next month">
            <Icon icon="material-symbols:chevron-right" />
          </button>
        </div>
      </div>

      <div class="ring-left"></div>
      <div class="ring-right"></div>
    </header>

    <table class="calendar">
      <thead>
        <tr>
          <th v-for="(day, index) in weekdays" :key="index">{{ day }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(week, weekIndex) in weeks" :key="weekIndex">
          <td
            v-for="cell in week"
            :key="cell.date"
            :class="cellClass(cell)"
            @click="selectDate(cell)"
          >
            {{ cell.date }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'

const emit = defineEmits(['select'])

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const now = new Date()
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())
const selectedDate = ref(new Date(today))

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

function getMonthCells(year, month) {
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay() // 周日=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevYear = month === 0 ? year - 1 : year
  const prevMonth = month === 0 ? 11 : month - 1
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate()

  const cells = []

  for (let i = 0; i < startOffset; i++) {
    const date = daysInPrevMonth - startOffset + i + 1
    cells.push({
      year: prevYear,
      month: prevMonth,
      date,
      isCurrentMonth: false
    })
  }

  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      year,
      month,
      date: i,
      isCurrentMonth: true
    })
  }

  const remaining = (7 - (cells.length % 7)) % 7
  const nextYear = month === 11 ? year + 1 : year
  const nextMonth = month === 11 ? 0 : month + 1

  for (let i = 1; i <= remaining; i++) {
    cells.push({
      year: nextYear,
      month: nextMonth,
      date: i,
      isCurrentMonth: false
    })
  }

  return cells
}

const cells = computed(() => getMonthCells(currentYear.value, currentMonth.value))

const weeks = computed(() => {
  const result = []
  for (let i = 0; i < cells.value.length; i += 7) {
    result.push(cells.value.slice(i, i + 7))
  }
  return result
})

const monthName = computed(() => {
  return new Date(currentYear.value, currentMonth.value).toLocaleString('en-US', { month: 'long' })
})

function cellClass(cell) {
  const cellDate = new Date(cell.year, cell.month, cell.date)
  const isToday = isSameDay(cellDate, today)
  const isSelected = isSameDay(cellDate, selectedDate.value)
  return {
    'other-month': !cell.isCurrentMonth,
    'today': isToday,
    'selected': isSelected
  }
}

function selectDate(cell) {
  currentYear.value = cell.year
  currentMonth.value = cell.month
  const date = new Date(cell.year, cell.month, cell.date)
  selectedDate.value = date
  emit('select', date)
}

function goToday() {
  currentYear.value = today.getFullYear()
  currentMonth.value = today.getMonth()
  selectedDate.value = new Date(today)
  emit('select', new Date(today))
}

function prevMonth() {
  if (currentMonth.value === 0) {
    currentYear.value--
    currentMonth.value = 11
  } else {
    currentMonth.value--
  }
  selectedDate.value = new Date(currentYear.value, currentMonth.value, 1)
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentYear.value++
    currentMonth.value = 0
  } else {
    currentMonth.value++
  }
  selectedDate.value = new Date(currentYear.value, currentMonth.value, 1)
}
</script>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  background-color: rgb(234, 248, 236);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  border-radius: 0 0 30px 30px;
}

header {
  position: relative;
  width: 100%;
  min-height: 140px;
  background-color: rgb(167, 233, 186);
  color: rgb(80, 140, 134);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background-size: cover;
  background-image: url('@/assets/img/calender.jpg');
}

.day {
  font-size: clamp(36px, 8vw, 56px);
  font-weight: bold;
  margin-right: 16px;
  text-transform: uppercase;
  line-height: 1;
}

.month-year {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.month {
  font-size: clamp(18px, 4vw, 24px);
  font-weight: bold;
}

.nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  color: rgb(45, 90, 65);
  font-size: 18px;
  cursor: pointer;
  transition: background 0.2s ease;
  padding: 0;
}

.nav-btn.today {
  width: auto;
  padding: 0 10px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 500;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.9);
}

.calendar {
  position: relative;
  table-layout: fixed;
  width: 100%;
  text-align: center;
  border-collapse: collapse;
  padding: 10px;
}

.calendar thead {
  font-size: clamp(12px, 2.5vw, 14px);
  color: rgb(80, 140, 134);
}

.calendar th,
.calendar td {
  text-align: center;
  padding: clamp(8px, 2.5vw, 14px) 0;
}

.calendar th {
  font-weight: 600;
  padding-top: clamp(16px, 4vw, 24px);
  padding-bottom: 8px;
}

.calendar td {
  border-radius: 50%;
  font-size: clamp(14px, 3vw, 18px);
  font-weight: 500;
  color: rgb(45, 90, 65);
  cursor: pointer;
  transition: all 0.2s ease;
  aspect-ratio: 1 / 1;
}

.calendar td:hover {
  color: rgb(80, 140, 134);
  background-color: rgb(181, 199, 186);
}

.today {
  color: rgb(80, 140, 134);
  font-weight: 700;
  background-color: rgba(130, 226, 216, 0.3);
}

.selected {
  color: #fff;
  background-color: rgb(99, 149, 86);
}

.selected:hover {
  background-color: rgb(79, 129, 66);
}

.other-month {
  color: rgb(130, 226, 216);
}

.ring-left,
.ring-right {
  position: absolute;
  bottom: -12px;
  z-index: 2;
}

.ring-left {
  left: 12px;
}

.ring-right {
  right: 12px;
}

.ring-left::before,
.ring-right::before {
  content: '';
  display: inline-block;
  width: 10px;
  height: 28px;
  border-radius: 5px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}
</style>
