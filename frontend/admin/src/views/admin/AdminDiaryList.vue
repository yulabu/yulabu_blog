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
          <div class="diary-content">{{ diary.content }}</div>
          <div v-if="diary.images && diary.images.length" class="diary-images">
            <img v-for="(img, idx) in diary.images.slice(0, 3)" :key="idx" :src="img" class="diary-image" />
            <span v-if="diary.images.length > 3" class="diary-more">+{{ diary.images.length - 3 }}</span>
          </div>
          <div class="diary-footer">
            <span class="diary-date">{{ formatDate(diary.created_at) }}</span>
            <div class="diary-actions">
              <AdminButton variant="text" @click="goEdit(diary.id)">编辑</AdminButton>
              <AdminButton variant="danger" :loading="deleteLoading" @click="onDelete(diary.id)">删除</AdminButton>
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
import { getDiaries, deleteDiary } from '@/api/diary'
import { formatDate } from '@/utils/date'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import Pagination from '@/components/common/Pagination.vue'

const router = useRouter()
const { toast } = useMessageBox()

const diaries = ref([])
const loading = ref(false)
const page = ref(1)
const totalPages = ref(1)

async function fetchDiaries() {
  loading.value = true
  try {
    const res = await getDiaries(page.value)
    diaries.value = res.diaries
    totalPages.value = res.totalPages
  } catch (e) {
    toast(e.message || '获取日记列表失败', 'error')
  } finally {
    loading.value = false
  }
}

fetchDiaries()

function goNew() {
  router.push('/admin/diaries/new')
}

function goEdit(id) {
  router.push(`/admin/diaries/${id}/edit`)
}

const { confirmDelete: onDelete, loading: deleteLoading } = useConfirmDelete(deleteDiary, {
  message: '确定要删除这条日记吗？',
  successMessage: '删除成功',
  onSuccess: fetchDiaries
})
</script>

<style scoped>
.diary-list-page {
  width: 100%;
}

.diary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  padding: 8px 0 16px;
}

.diary-card {
  border: 1px solid var(--color-border, #e5e6eb);
  border-radius: 12px;
  background: #ffffff;
  padding: 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.diary-card:hover {
  border-color: var(--color-primary, #165dff);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.diary-content {
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow: hidden;
}

.diary-images {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.diary-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
}

.diary-more {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  font-size: 14px;
  color: var(--color-muted);
}

.diary-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.diary-date {
  font-size: 12px;
  color: var(--color-muted);
}

.diary-actions {
  display: flex;
  gap: 4px;
}
</style>
