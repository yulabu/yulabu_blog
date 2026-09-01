<template>
  <div class="trend-chart-card">
    <div class="chart-header">
      <h3 class="chart-title">
        <Icon icon="material-symbols:trending-up" class="title-icon" />
        发文与访问趋势
      </h3>
      <div class="range-tabs">
        <button
          v-for="tab in rangeTabs"
          :key="tab.value"
          class="range-tab"
          :class="{ active: range === tab.value }"
          @click="setRange(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>
    <div ref="chartRef" class="chart-body" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { DashboardChartData } from '@/types/api'

interface Props {
  data: DashboardChartData
  range: '7days' | '30days'
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:range', value: '7days' | '30days'): void
}>()

const rangeTabs = [
  { label: '近7天', value: '7days' as const },
  { label: '近30天', value: '30days' as const }
]

const chartRef = ref<HTMLDivElement>()
let chartInstance: echarts.ECharts | null = null

function formatDateLabel(dateStr: string) {
  const [, month, day] = dateStr.split('-')
  return `${month}-${day}`
}

function initChart() {
  if (!chartRef.value) return
  chartInstance = echarts.init(chartRef.value)
  window.addEventListener('resize', handleResize)
}

function handleResize() {
  chartInstance?.resize()
}

function updateOption() {
  if (!chartInstance) return
  const { postsByDate, visitsByDate } = props.data
  const xLabels = postsByDate.map(item => formatDateLabel(item.date))

  chartInstance.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['发文数', '浏览量', '独立访客'],
      bottom: 0
    },
    grid: {
      left: 16,
      right: 16,
      top: 24,
      bottom: 40,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } },
      axisLabel: { color: 'var(--color-muted)' }
    },
    yAxis: [
      {
        type: 'value',
        name: '发文数',
        minInterval: 1,
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } },
        axisLabel: { color: 'var(--color-muted)' }
      },
      {
        type: 'value',
        name: '访问量',
        splitLine: { show: false },
        axisLabel: { color: 'var(--color-muted)' }
      }
    ],
    series: [
      {
        name: '发文数',
        type: 'bar',
        barWidth: '40%',
        itemStyle: {
          color: 'rgba(var(--color-primary-rgb), 0.8)',
          borderRadius: [4, 4, 0, 0]
        },
        data: postsByDate.map(item => item.count)
      },
      {
        name: '浏览量',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        showSymbol: false,
        itemStyle: { color: '#3b82f6' },
        lineStyle: { width: 3 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.25)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.02)' }
          ])
        },
        data: visitsByDate.map(item => item.pv)
      },
      {
        name: '独立访客',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        showSymbol: false,
        itemStyle: { color: '#10b981' },
        lineStyle: { width: 3 },
        data: visitsByDate.map(item => item.uv)
      }
    ]
  }, true)
}

function setRange(value: '7days' | '30days') {
  if (value === props.range) return
  emit('update:range', value)
}

watch(() => props.data, updateOption, { deep: true })

onMounted(() => {
  echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer])
  initChart()
  updateOption()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<style scoped>
.trend-chart-card {
  padding: 24px;
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

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: rgb(45, 90, 65);
  margin: 0;
}

.title-icon {
  font-size: 22px;
}

.range-tabs {
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  padding: 4px;
}

.range-tab {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.range-tab:hover {
  color: var(--color-heading);
}

.range-tab.active {
  background: #ffffff;
  color: var(--color-heading);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.chart-body {
  width: 100%;
  height: 320px;
}

@media (max-width: 480px) {
  .chart-body {
    height: 260px;
  }
}
</style>
