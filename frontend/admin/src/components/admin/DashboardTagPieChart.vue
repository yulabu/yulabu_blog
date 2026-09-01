<template>
  <div class="tag-pie-card">
    <h3 class="chart-title">
      <Icon icon="material-symbols:donut-large" class="title-icon" />
      标签文章占比
    </h3>
    <div ref="chartRef" class="chart-body" />
    <div v-if="empty" class="empty-tip">暂无标签数据</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { Icon } from '@iconify/vue'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  TitleComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { DashboardChartData } from '@/types/api'

interface Props {
  data: DashboardChartData
}

const props = defineProps<Props>()

const empty = computed(() => props.data.tagsDistribution.length === 0)

const chartRef = ref<HTMLDivElement>()
let chartInstance: echarts.ECharts | null = null

const palette = [
  'rgba(var(--color-primary-rgb), 0.85)',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316'
]

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
  const data = props.data.tagsDistribution.length ? props.data.tagsDistribution : [{ name: '无数据', value: 1 }]

  chartInstance.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 篇 ({d}%)'
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      bottom: 0,
      textStyle: { color: 'var(--color-muted)' }
    },
    color: palette,
    series: [
      {
        name: '标签占比',
        type: 'pie',
        cursor: 'default',
        radius: ['35%', '55%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        minShowLabelAngle: 5,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          color: 'var(--color-heading)',
          fontSize: 12
        },
        labelLine: {
          show: true,
          length: 12,
          length2: 8
        },
        emphasis: {
          disabled: true
        },
        data
      }
    ]
  }, true)
}

watch(() => props.data, updateOption, { deep: true })

onMounted(() => {
  echarts.use([PieChart, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer])
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
.tag-pie-card {
  position: relative;
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
  height: 100%;
  box-sizing: border-box;
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: rgb(45, 90, 65);
  margin: 0 0 16px;
}

.title-icon {
  font-size: 22px;
}

.chart-body {
  width: 100%;
  height: 280px;
  cursor: default;
}

.empty-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--color-muted);
  font-size: 14px;
}

@media (max-width: 480px) {
  .chart-body {
    height: 240px;
  }
}
</style>
