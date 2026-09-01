<template>
  <div class="column-list-page">
    <AdminPageCard
      title="专栏管理"
      :loading="loading"
      :empty="!loading && columns.length === 0"
      empty-text="暂无专栏"
    >
      <template #search>
        <AdminSearchBar placeholder="搜索专栏..." @search="onSearch" />
      </template>
      <template #actions>
        <AdminButton variant="primary" @click="goNew">新建专栏</AdminButton>
      </template>

      <div class="card-grid">
        <div v-for="col in filteredColumns" :key="col.id" class="column-card">
          <div class="card-cover" :class="{ 'is-failed': coverFailed.has(col.id) || !col.cover }">
            <img
              v-if="col.cover && !coverFailed.has(col.id)"
              :src="col.cover"
              :alt="col.name"
              loading="lazy"
              @error="onCoverError(col.id)"
            />
            <span v-else>暂无封面</span>
          </div>

          <div class="card-body">
            <span class="card-title" :title="col.name">{{ col.name }}</span>
            <span v-if="col.desc" class="card-desc" :title="col.desc">{{ col.desc }}</span>

            <div class="card-info">
              <span class="info-item">📄 {{ col.post_count }} 篇文章</span>
              <span class="info-item">排序 {{ col.sort_order }}</span>
              <AdminStatusBadge :type="col.status" />
            </div>

            <div class="card-actions">
              <AdminButton variant="text" @click="goPosts(col)">管理文章</AdminButton>
              <AdminButton variant="text" @click="goEdit(col.id)">编辑</AdminButton>
              <AdminButton variant="danger" :loading="deleteLoading" @click="onDelete(col.id)">删除</AdminButton>
            </div>
          </div>
        </div>
      </div>
    </AdminPageCard>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageBox } from '@/composables/useMessageBox'
import { useAdminList } from '@/composables/useAdminList'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import { getAdminColumns, deleteColumn } from '@/api/column'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminSearchBar from '@/components/admin/AdminSearchBar.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge.vue'

const router = useRouter()
const { toast } = useMessageBox()
const searchQuery = ref('')

const { items: columns, loading, refresh } = useAdminList(getAdminColumns, {
  paginated: false,
  errorMessage: '获取专栏列表失败'
})

const filteredColumns = computed(() => {
  if (!searchQuery.value) return columns.value
  const q = searchQuery.value.toLowerCase()
  return columns.value.filter(c => c.name.toLowerCase().includes(q))
})

// 封面加载失败记录（失败态与无封面一致：灰底"暂无封面"）
const coverFailed = ref(new Set())

function onCoverError(id) {
  coverFailed.value = new Set(coverFailed.value).add(id)
}

function onSearch(q) {
  searchQuery.value = q
}

function goNew() {
  router.push('/admin/columns/new')
}

function goEdit(id) {
  router.push(`/admin/columns/${id}/edit`)
}

function goPosts(row) {
  router.push(`/admin/columns/${row.id}/posts`)
}

const { confirmDelete: onDelete, loading: deleteLoading } = useConfirmDelete(deleteColumn, {
  message: '确定要删除这个专栏吗？专栏下的文章不会被删除。',
  successMessage: '删除成功',
  onSuccess: refresh
})
</script>

<style scoped>
.column-list-page {
  width: 100%;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  padding: 8px 0 16px;
}

.column-card {
  border: 1px solid var(--color-border, #e5e6eb);
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.column-card:hover {
  border-color: var(--color-primary, #165dff);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.card-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #f2f3f5;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted);
  font-size: 13px;
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.card-body {
  padding: 12px 14px;
}

.card-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.card-desc {
  display: block;
  font-size: 12px;
  color: var(--color-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8px;
}

.card-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--color-muted);
  margin-bottom: 6px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>