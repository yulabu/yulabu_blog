<template>
  <div class="diary-list-page">
    <AdminPageCard
      title="日记管理"
      subtitle="管理你的日记"
      :loading="loading"
      :empty="!loading && diaries.length === 0"
      empty-text="暂无日记"
    >
      <template #actions>
        <AdminButton variant="primary" @click="goNew">写日记</AdminButton>
      </template>

      <div class="diary-grid">
        <div v-for="diary in diaries" :key="diary.id" class="diary-card">
          <div class="card-cover" :class="{ 'is-empty': !firstImage(diary) }">
            <img
              v-if="firstImage(diary)"
              :src="firstImage(diary)"
              :alt="diaryTitle(diary)"
              loading="lazy"
            />
            <span v-else>暂无图片</span>
          </div>

          <div class="card-body">
            <span class="card-title" :title="diaryTitle(diary)">{{ diaryTitle(diary) }}</span>
            <p v-if="diaryBody(diary)" class="card-excerpt">{{ diaryBody(diary) }}</p>
            <div class="card-bottom">
              <span class="card-date">🕐 {{ formatDate(diary.created_at) }}</span>
              <div class="card-actions">
                <AdminButton variant="text" @click="goEdit(diary.id)">编辑</AdminButton>
                <AdminButton variant="danger" :loading="deleteLoading" @click="onDelete(diary.id)">删除</AdminButton>
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
import { useMessageBox } from '@/composables/useMessageBox'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import { useAdminList } from '@/composables/useAdminList'
import { getDiaries, deleteDiary } from '@/api/diary'
import { formatDate } from '@/utils/date'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import Pagination from '@/components/common/Pagination.vue'

const router = useRouter()
const { toast } = useMessageBox()

const { items: diaries, loading, page, totalPages, refresh } = useAdminList(
  (pageNum, pageSize) => getDiaries(pageNum, pageSize),
  {
    errorMessage: '获取日记列表失败',
    extractList: data => data.diaries,
    extractTotalPages: data => data.totalPages || 1
  }
)

function diaryTitle(diary) {
  const firstLine = diary.content.split('\n')[0].trim()
  return firstLine.slice(0, 30)
}

function diaryBody(diary) {
  const rest = diary.content.split('\n').slice(1).join('\n').trim()
  return rest
}

function firstImage(diary) {
  return diary.images && diary.images.length ? diary.images[0] : ''
}

function goNew() {
  router.push('/admin/diaries/new')
}

function goEdit(id) {
  router.push(`/admin/diaries/${id}/edit`)
}

const { confirmDelete: onDelete, loading: deleteLoading } = useConfirmDelete(deleteDiary, {
  message: '确定要删除这条日记吗？',
  successMessage: '删除成功',
  onSuccess: refresh
})
</script>

<style scoped>
.diary-list-page {
  width: 100%;
}

.diary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  padding: 8px 0 16px;
}

.diary-card {
  border: 1px solid var(--color-border, #e5e6eb);
  border-radius: 10px;
  background: #ffffff;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.diary-card:hover {
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
  padding: 10px 12px 12px;
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

.card-excerpt {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--color-muted);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
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
