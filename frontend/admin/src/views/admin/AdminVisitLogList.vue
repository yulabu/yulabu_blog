<template>
  <div class="visit-log-page">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon">
          <Icon icon="material-symbols:visibility-outline" />
        </div>
        <div class="stat-info">
          <div class="stat-label">今日 PV</div>
          <div class="stat-value">{{ stats.todayPV }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon uv">
          <Icon icon="material-symbols:person-outline" />
        </div>
        <div class="stat-info">
          <div class="stat-label">今日 UV</div>
          <div class="stat-value">{{ stats.todayUV }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon total">
          <Icon icon="material-symbols:bar-chart-outline" />
        </div>
        <div class="stat-info">
          <div class="stat-label">总 PV</div>
          <div class="stat-value">{{ formatNumber(stats.totalPV) }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon total-uv">
          <Icon icon="material-symbols:group-outline" />
        </div>
        <div class="stat-info">
          <div class="stat-label">总 UV</div>
          <div class="stat-value">{{ formatNumber(stats.totalUV) }}</div>
        </div>
      </div>
    </div>

    <AdminPageCard
      title="访问日志"
      :loading="loading"
      :empty="!loading && visits.length === 0"
      empty-text="暂无访问记录"
    >
      <!-- 筛选区 -->
      <template #search>
        <div class="filter-bar">
          <div class="filter-group">
            <label class="filter-label">时间范围</label>
            <select v-model="dateRange" class="filter-select" @change="onDateRangeChange">
              <option value="today">今天</option>
              <option value="7days">近7天</option>
              <option value="30days">近30天</option>
              <option value="all">全部</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">IP 地址</label>
            <input
              v-model="ipFilter"
              type="text"
              class="filter-input"
              placeholder="输入 IP 筛选..."
              @keyup.enter="onSearch"
            />
          </div>
        </div>
      </template>

      <template #actions>
        <AdminButton variant="danger" @click="onClearAll">
          <Icon icon="material-symbols:delete-sweep-outline" style="margin-right: 4px" />
          清空日志
        </AdminButton>
      </template>

      <AdminDataTable :columns="columns" :data="visits">
        <template #cell-created_at="{ row }">
          <AdminDataTableCellText muted>{{ formatDateTime(row.createdAt) }}</AdminDataTableCellText>
        </template>

        <template #cell-postTitle="{ row }">
          <AdminDataTableCellText>
            <span v-if="row.postTitle" class="post-title-link">{{ row.postTitle }}</span>
            <span v-else class="muted-text">—</span>
          </AdminDataTableCellText>
        </template>

        <template #cell-ip="{ row }">
          <AdminDataTableCellText>{{ row.ip }}</AdminDataTableCellText>
        </template>

        <template #cell-referrer="{ row }">
          <AdminDataTableCellText muted>
            {{ extractDomain(row.referrer) || '直接访问' }}
          </AdminDataTableCellText>
        </template>

        <template #cell-userAgent="{ row }">
          <AdminDataTableCellText
            :title="row.userAgent || ''"
            muted
            class="ua-cell"
          >
            {{ truncateUA(row.userAgent) }}
          </AdminDataTableCellText>
        </template>
      </AdminDataTable>

      <Pagination v-if="!loading && totalPages > 1" v-model:page="page" :totalPages="totalPages" />
    </AdminPageCard>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useMessageBox } from '@/composables/useMessageBox'
import { useAdminList } from '@/composables/useAdminList'
import { getAdminVisits, getVisitStats, clearAllVisits } from '@/api/visit'
import { formatDateTime } from '@/utils/date'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminDataTable from '@/components/admin/AdminDataTable.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import AdminDataTableCellText from '@/components/admin/data-table/AdminDataTableCellText.vue'
import Pagination from '@/components/common/Pagination.vue'

const { toast, confirm } = useMessageBox()

// 筛选状态
const dateRange = ref('all')
const ipFilter = ref('')

// 列表数据
const { items: visits, loading, page, totalPages, fetch: fetchVisits, refresh } = useAdminList(
  (pageNum, pageSize) => getAdminVisits(pageNum, pageSize, dateRange.value, ipFilter.value || undefined),
  {
    extractList: data => data.visits || [],
    extractTotalPages: data => data.totalPages || 1,
    errorMessage: '获取访问日志失败'
  }
)

// 统计数据
const stats = ref({ todayPV: 0, todayUV: 0, totalPV: 0, totalUV: 0 })

const columns = [
  { key: 'created_at', label: '时间' },
  { key: 'postTitle', label: '文章' },
  { key: 'ip', label: 'IP 地址' },
  { key: 'referrer', label: '来源' },
  { key: 'userAgent', label: '浏览器' }
]

function formatNumber(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return String(n)
}

function extractDomain(url) {
  if (!url) return ''
  try {
    return new URL(url).hostname
  } catch {
    return url.slice(0, 40)
  }
}

function truncateUA(ua) {
  if (!ua) return '—'
  return ua.length > 50 ? ua.slice(0, 50) + '...' : ua
}

function onDateRangeChange() {
  page.value = 1
  fetchVisits()
}

function onSearch() {
  page.value = 1
  fetchVisits()
}

async function onClearAll() {
  const ok = await confirm('清空全部日志', '此操作不可撤销，确定要清空所有访问日志吗？')
  if (!ok) return

  try {
    const result = await clearAllVisits()
    toast(result.message || '清空成功')
    refresh()
    fetchStats()
  } catch (e) {
    toast(e.message || '清空失败', 'error')
  }
}

async function fetchStats() {
  try {
    stats.value = await getVisitStats()
  } catch {
    // 静默失败，不影响主流程
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<style scoped>
.visit-log-page {
  width: 100%;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 14px;
  background: linear-gradient(135deg,
      rgba(255, 255, 255, 0.7),
      rgba(255, 255, 255, 0.3));
  border-top: 1px solid white;
  border-left: 1px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(12px);
}

.stat-icon {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(var(--color-primary-rgb), 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--color-primary);
}

.stat-icon.uv {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.stat-icon.total {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.stat-icon.total-uv {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.stat-label {
  font-size: 13px;
  color: var(--color-muted);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-heading);
}

.filter-bar {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: 12px;
  color: var(--color-muted);
  font-weight: 500;
}

.filter-select,
.filter-input {
  padding: 8px 12px;
  border: 1px solid var(--border-light, rgba(0, 0, 0, 0.1));
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-heading);
  background: white;
  outline: none;
  transition: border-color 0.2s;
}

.filter-select:focus,
.filter-input:focus {
  border-color: var(--color-primary);
}

.filter-input {
  width: 180px;
}

.post-title-link {
  color: var(--color-heading);
  font-weight: 500;
}

.muted-text {
  color: var(--color-muted);
}

.ua-cell {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-input {
    width: 100%;
  }
}
</style>
