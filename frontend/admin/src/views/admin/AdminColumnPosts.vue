<template>
  <div class="column-posts-page">
    <AdminPageCard
      :title="`文章排序 · ${column?.name || ''}`"
      :loading="loading"
      :empty="!loading && posts.length === 0"
      empty-text="专栏内暂无文章"
    >
      <template #actions>
        <AdminButton variant="secondary" @click="goBack">返回</AdminButton>
        <AdminButton variant="primary" @click="openAddModal">添加文章</AdminButton>
      </template>

      <div class="drag-tip">拖拽手柄调整顺序，松手自动保存</div>

      <ul ref="listRef" class="sort-list">
        <li
          v-for="(post, index) in posts"
          :key="post.id"
          class="sort-item"
        >
          <span class="drag-handle">
            <Icon icon="material-symbols:drag-indicator" class="handle-icon" />
          </span>
          <span class="sort-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <div class="sort-info">
            <span class="sort-title">{{ post.title }}</span>
            <span v-if="post.category" class="sort-category">{{ post.category.name }}</span>
          </div>
          <span class="sort-date">{{ formatDate(post.createdAt) }}</span>
          <AdminButton variant="danger" @click="onRemove(post)">移出</AdminButton>
        </li>
      </ul>
    </AdminPageCard>

    <AdminModal
      v-model:visible="addModalVisible"
      title="添加文章"
      confirm-text="确定"
      :confirm-loading="adding"
      @confirm="onAdd"
    >
      <AdminFormField label="选择文章" hint="仅显示未加入任何专栏的已发布文章">
        <div class="candidate-list">
          <label v-for="c in candidates" :key="c.id" class="candidate-item">
            <input v-model="selectedCandidates" type="checkbox" :value="c.id" />
            <span class="candidate-title">{{ c.title }}</span>
            <span v-if="c.category" class="sort-category">{{ c.category.name }}</span>
          </label>
          <div v-if="!candidates.length" class="candidate-empty">暂无可添加的文章</div>
        </div>
      </AdminFormField>
    </AdminModal>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sortable from 'sortablejs'
import { Icon } from '@iconify/vue'
import { useMessageBox } from '@/composables/useMessageBox'
import { formatDate } from '@/utils/date'
import { getColumnPosts, addColumnPost, removeColumnPost, updateColumnPostOrder } from '@/api/column'
import AdminPageCard from '@/components/admin/AdminPageCard.vue'
import AdminModal from '@/components/admin/AdminModal.vue'
import AdminButton from '@/components/admin/AdminButton.vue'
import AdminFormField from '@/components/admin/forms/AdminFormField.vue'

const route = useRoute()
const router = useRouter()
const { toast } = useMessageBox()

const columnId = Number(route.params.id)
const loading = ref(false)
const column = ref(null)
const posts = ref([])
const candidates = ref([])
const listRef = ref(null)
let sortable = null

const addModalVisible = ref(false)
const selectedCandidates = ref([])
const adding = ref(false)

async function fetchData() {
  loading.value = true
  try {
    const data = await getColumnPosts(columnId)
    column.value = data.column
    posts.value = data.posts
    candidates.value = data.candidates
  } catch (e) {
    toast(e.message || '获取数据失败', 'error')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/admin/columns')
}

function openAddModal() {
  selectedCandidates.value = []
  addModalVisible.value = true
}

async function onAdd() {
  if (!selectedCandidates.value.length) {
    toast('请至少选择一篇文章', 'error')
    return
  }
  adding.value = true
  try {
    for (const id of selectedCandidates.value) {
      await addColumnPost(columnId, id)
    }
    toast('添加成功')
    addModalVisible.value = false
    await fetchData()
  } catch (e) {
    toast(e.message || '添加失败', 'error')
  } finally {
    adding.value = false
  }
}

async function onRemove(post) {
  try {
    await removeColumnPost(columnId, post.id)
    toast('已移出')
    await fetchData()
  } catch (e) {
    toast(e.message || '移出失败', 'error')
  }
}

async function initSortable() {
  await nextTick()
  if (!listRef.value) return
  sortable = Sortable.create(listRef.value, {
    animation: 200,
    handle: '.drag-handle',
    ghostClass: 'sort-ghost',
    onEnd: async () => {
      const order = posts.value.map(p => p.id)
      try {
        await updateColumnPostOrder(columnId, order)
        toast('排序已保存')
      } catch (e) {
        toast('排序保存失败', 'error')
        await fetchData()
      }
    }
  })
}

onMounted(() => {
  fetchData().then(initSortable)
})

onBeforeUnmount(() => {
  sortable?.destroy()
  sortable = null
})
</script>

<style scoped>
.column-posts-page {
  width: 100%;
}

.drag-tip {
  font-size: 12px;
  color: var(--color-muted);
  margin-bottom: 12px;
}

.sort-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sort-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: linear-gradient(to right bottom,
      var(--bg-glass-start),
      var(--bg-glass-mid),
      var(--bg-glass-end));
  border-top: 1px solid var(--border-light);
  border-left: 1px solid var(--border-light);
  transition: transform 0.2s, box-shadow 0.2s;
}

.sort-item:hover {
  box-shadow: 0 4px 12px var(--shadow-color);
}

.sort-ghost {
  opacity: 0.4;
  box-shadow: 0 4px 12px var(--shadow-color);
}

.drag-handle {
  display: flex;
  align-items: center;
  cursor: grab;
  color: var(--color-muted);
  padding: 4px;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;
  touch-action: none;
}

.drag-handle:hover {
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.12);
}

.drag-handle:active {
  cursor: grabbing;
}

.handle-icon {
  font-size: 20px;
}

.sort-index {
  flex-shrink: 0;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-primary);
  min-width: 26px;
}

.sort-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.sort-title {
  font-size: 14px;
  color: var(--color-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sort-category {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-text);
  font-size: 11px;
}

.sort-date {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--color-muted);
  white-space: nowrap;
}

.candidate-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
}

.candidate-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.candidate-item:hover {
  background: rgba(var(--color-primary-rgb), 0.08);
}

.candidate-item input {
  accent-color: var(--color-primary);
}

.candidate-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.candidate-empty {
  padding: 20px 0;
  text-align: center;
  font-size: 13px;
  color: var(--color-muted);
}
</style>