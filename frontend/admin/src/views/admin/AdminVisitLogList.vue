<template>
  <div class="visit-log-page">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon">
          <Icon icon="material-symbols:visibility-outline" />
        </div>
        <div class="stat-info">
          <div class="stat-label">今日浏览量</div>
          <div class="stat-value">{{ stats.todayPV }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon uv">
          <Icon icon="material-symbols:person-outline" />
        </div>
        <div class="stat-info">
          <div class="stat-label">今日独立访客</div>
          <div class="stat-value">{{ stats.todayUV }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon total">
          <Icon icon="material-symbols:bar-chart-outline" />
        </div>
        <div class="stat-info">
          <div class="stat-label">总浏览量</div>
          <div class="stat-value">{{ formatNumber(stats.totalPV) }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon total-uv">
          <Icon icon="material-symbols:group-outline" />
        </div>
        <div class="stat-info">
          <div class="stat-label">总独立访客</div>
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
      <template #actions>
        <div class="toolbar">
          <div class="toolbar-group">
            <label class="toolbar-label">时间</label>
            <select v-model="dateRange" class="toolbar-select" @change="onDateRangeChange">
              <option value="today">今天</option>
              <option value="7days">近7天</option>
              <option value="30days">近30天</option>
              <option value="all">全部</option>
            </select>
          </div>
          <div class="toolbar-group">
            <label class="toolbar-label">IP</label>
            <input
              v-model="ipFilter"
              type="text"
              class="toolbar-input"
              placeholder="输入 IP..."
              @keyup.enter="onSearch"
            />
          </div>
          <AdminButton variant="primary" @click="onSearch">
            <Icon icon="material-symbols:search" style="margin-right: 4px" />
            查询
          </AdminButton>
          <div class="toolbar-divider" />
          <AdminButton variant="danger" @click="onClearAll">
            <Icon icon="material-symbols:delete-sweep-outline" style="margin-right: 4px" />
            清空日志
          </AdminButton>
        </div>
      </template>

      <AdminDataTable :columns="columns" :data="visits">
        <template #cell-created_at="{ row }">
          <AdminDataTableCellText>{{ formatDateTime(row.createdAt) }}</AdminDataTableCellText>
        </template>

        <template #cell-postTitle="{ row }">
          <AdminDataTableCellText>
            <span v-if="row.postTitle" class="post-title-link">{{ row.postTitle }}</span>
            <span v-else class="muted-text">—</span>
          </AdminDataTableCellText>
        </template>

        <template #cell-ip="{ row }">
          <AdminDataTableCellText class="ip-text">{{ row.ip }}</AdminDataTableCellText>
        </template>

        <template #cell-referrer="{ row }">
          <AdminDataTableCellText>
            <a
              v-if="isExternalLink(row.referrer)"
              :href="row.referrer"
              target="_blank"
              rel="noopener noreferrer"
              class="source-link"
              @click.stop
            >
              {{ extractDomain(row.referrer) }}
            </a>
            <span v-else class="muted-text">{{ extractDomain(row.referrer) || '直接访问' }}</span>
          </AdminDataTableCellText>
        </template>

        <template #cell-userAgent="{ row }">
          <AdminDataTableCellText
            :title="row.userAgent || ''"
            class="browser-cell"
          >
            {{ parseBrowser(row.userAgent) }}
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
  { key: 'created_at', label: '时间', class: 'col-time' },
  { key: 'postTitle', label: '文章', class: 'col-post' },
  { key: 'ip', label: 'IP', class: 'col-ip' },
  { key: 'referrer', label: '来源', class: 'col-source' },
  { key: 'userAgent', label: '浏览器', class: 'col-browser' }
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

function isExternalLink(url) {
  if (!url) return false
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function parseBrowser(ua) {
  if (!ua) return '—'
  const rules = [
    { key: 'Edg/', name: 'Edge' },
    { key: 'Edge/', name: 'Edge' },
    { key: 'OPR/', name: 'Opera' },
    { key: 'Opera/', name: 'Opera' },
    { key: 'Chrome/', name: 'Chrome' },
    { key: 'Safari/', name: 'Safari' },
    { key: 'Firefox/', name: 'Firefox' },
    { key: 'MSIE ', name: 'IE' },
    { key: 'Trident/', name: 'IE' }
  ]
  for (const rule of rules) {
    if (ua.includes(rule.key)) return rule.name
  }
  return ua.length > 12 ? ua.slice(0, 12) + '...' : ua
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

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-label {
  font-size: 13px;
  color: var(--color-muted);
  font-weight: 500;
  white-space: nowrap;
}

.toolbar-select,
.toolbar-input {
  padding: 6px 10px;
  border: 1px solid var(--border-light, rgba(0, 0, 0, 0.1));
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-heading);
  background: white;
  outline: none;
  transition: border-color 0.2s;
}

.toolbar-select:focus,
.toolbar-input:focus {
  border-color: var(--color-primary);
}

.toolbar-input {
  width: 140px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: rgba(0, 0, 0, 0.1);
}

.post-title-link {
  color: var(--color-heading);
  font-weight: 500;
}

.muted-text {
  color: var(--color-muted);
}

.ip-text {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 13px;
}

.source-link {
  color: var(--color-primary);
  text-decoration: none;
}

.source-link:hover {
  text-decoration: underline;
}

.browser-cell {
  font-size: 13px;
}

:deep(.col-time) {
  width: 160px;
  min-width: 160px;
}

:deep(.col-ip) {
  width: 120px;
  min-width: 120px;
}

:deep(.col-source) {
  width: 140px;
  min-width: 140px;
}

:deep(.col-browser) {
  width: 90px;
  min-width: 90px;
}

:deep(.col-post) {
  min-width: 200px;
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .toolbar {
    gap: 10px;
  }

  .toolbar-input {
    width: 120px;
  }

  .toolbar-divider {
    display: none;
  }

  :deep(.col-time),
  :deep(.col-source),
  :deep(.col-browser) {
    display: none;
  }
}

@media (max-width: 480px) {
  .stats-row {
    grid-template-columns: 1fr;
  }

  .toolbar {
    width: 100%;
  }

  .toolbar-group {
    flex: 1;
  }

  .toolbar-select,
  .toolbar-input {
    width: 100%;
  }
}
</style>
