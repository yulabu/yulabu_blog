<template>
  <div class="post-list-page">
    <AdminPageCard
      title="文章管理"
      subtitle="管理全部文章（已发布 / 草稿 / 回收站）"
      :loading="loading"
      :empty="!loading && posts.length === 0"
    >
      <template #search>
        <AdminSearchBar placeholder="搜索文章标题..." @search="onSearch" />
      </template>
      <template #actions>
        <div class="filter-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="tab-btn"
            :class="{ active: activeTab === tab.value }"
            @click="onTabChange(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>
        <AdminButton variant="primary" @click="goNew">新增文章</AdminButton>
      </template>

      <div class="card-grid">
        <div v-for="post in posts" :key="post.id" class="post-card">
          <div class="card-cover" :class="{ 'is-failed': coverFailed.has(post.id) || !post.cover }">
            <img
              v-if="post.cover && !coverFailed.has(post.id)"
              :src="post.cover"
              :alt="post.title"
              loading="lazy"
              @error="onCoverError(post.id)"
            />
            <span v-else>暂无封面</span>
          </div>

          <div class="card-body">
            <span class="card-title" :title="post.title">{{ post.title }}</span>
            <div class="card-bottom">
              <span class="card-date">🕐 {{ formatDate(post.createdAt) }}</span>
              <div class="card-actions">
                <AdminButton variant="text" @click="goEdit(post.id)">编辑</AdminButton>
                <template v-if="post.status === 'trash'">
                  <AdminButton variant="text" @click="onRestore(post.id)">恢复</AdminButton>
                  <AdminButton variant="danger" @click="onForceDelete(post.id)">彻底删除</AdminButton>
                </template>
                <AdminButton v-else variant="danger" @click="onDelete(post.id)">删除</AdminButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Pagination v-if="!loading && totalPages > 1" v-model:page="page" :totalPages="totalPages" />
    </AdminPageCard>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminList } from '@/composables/useAdminList'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import { useMessageBox } from '@/composables/useMessageBox'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { getAdminPosts, deletePost, restorePost, forceDeletePost } from '@/api/post'
import { formatDate } from '@/utils/date'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminSearchBar from '@/components/admin/AdminSearchBar.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import Pagination from '@/components/common/Pagination.vue'

const router = useRouter()
const { confirm } = useMessageBox()
const searchQuery = ref('')

const tabs = [
  { label: '全部', value: '' },
  { label: '已发布', value: 'published' },
  { label: '草稿', value: 'draft' },
  { label: '回收站', value: 'trash' }
]
const activeTab = ref('')

const { items: posts, loading, page, totalPages, fetch, refresh } = useAdminList(
  (pageNum, pageSize) => getAdminPosts(pageNum, pageSize, activeTab.value || undefined, searchQuery.value),
  {
    errorMessage: '获取文章列表失败',
    extractList: data => data.posts,
    extractTotalPages: data => data.totalPages || 1
  }
)

// 封面加载失败记录（失败态与无封面一致：灰底"暂无封面"）
const coverFailed = ref(new Set())

function onCoverError(id) {
  coverFailed.value = new Set(coverFailed.value).add(id)
}

function onTabChange(value) {
  activeTab.value = value
  page.value = 1
  coverFailed.value = new Set()
  fetch()
}

function onSearch(q) {
  searchQuery.value = q
  page.value = 1
  coverFailed.value = new Set()
  fetch()
}

function goNew() {
  router.push('/admin/posts/new')
}

function goEdit(id) {
  router.push(`/admin/posts/${id}/edit`)
}

const { confirmDelete: onDelete } = useConfirmDelete(deletePost, {
  message: '确定要删除这篇文章吗？删除后可在回收站恢复。',
  successMessage: '删除成功',
  onSuccess: refresh
})

const { run: doRestore } = useAsyncAction(restorePost, {
  successMessage: '恢复成功',
  onSuccess: refresh
})

async function onRestore(id) {
  const ok = await confirm('恢复确认', '确定要恢复这篇文章吗？恢复后将回到已发布列表。')
  if (!ok) return
  doRestore(id)
}

const { confirmDelete: onForceDelete } = useConfirmDelete(forceDeletePost, {
  title: '彻底删除确认',
  message: '彻底删除后无法恢复，确定要删除这篇文章吗？',
  successMessage: '已彻底删除',
  onSuccess: refresh
})
</script>

<style scoped>
.post-list-page {
  width: 100%;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  padding: 4px;
}

.tab-btn {
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

.tab-btn:hover {
  color: var(--color-heading);
}

.tab-btn.active {
  background: #ffffff;
  color: var(--color-heading);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  padding: 8px 0 16px;
}

.post-card {
  border: 1px solid var(--color-border, #e5e6eb);
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.post-card:hover {
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
  margin-bottom: 8px;
}

.card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-date {
  font-size: 12px;
  color: var(--color-muted);
  white-space: nowrap;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>
