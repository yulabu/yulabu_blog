<template>
  <div class="card">
    <div class="header">
      <span class="line"></span>
      <h4 class="title">标签</h4>
      <span class="count" v-if="tags.length">共 {{ tags.length }} 个</span>
      <button v-if="activeId" class="clear-tag" @click="onSelect(null)">全部</button>
    </div>
    <div class="body">
      <div v-if="loading" class="empty">
        <span>加载中...</span>
      </div>
      <div v-else-if="!tags.length" class="empty">
        <Icon icon="material-symbols:label-off-outline" class="empty-icon" />
        <span>暂无标签</span>
      </div>
      <div v-else class="tag-list">
        <span
          v-for="tag in tags"
          :key="tag.id"
          class="tag"
          :class="{ active: activeId === tag.id }"
          @click="onSelect(tag.id)"
        >
          {{ tag.name }} ({{ tag.count }})
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { getTags } from '@/api/tag'
import { useMessageBox } from '@/composables/useMessageBox'

const props = defineProps({
  activeId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['select'])

const tags = ref([])
const loading = ref(true)
const { toast } = useMessageBox()

async function fetchTags() {
  try {
    const data = await getTags()
    tags.value = (data || []).filter(tag => tag.count > 0)
  } catch (err) {
    toast('获取标签失败', 'error')
    tags.value = []
  } finally {
    loading.value = false
  }
}

function onSelect(id) {
  emit('select', id === props.activeId ? null : id)
}

onMounted(() => {
  fetchTags()
})
</script>

<style scoped>
.card {
  width: 100%;
  padding: 20px;
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

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(80, 140, 134, .25);
  margin-bottom: 16px;
}

.line {
  width: 4px;
  height: 20px;
  background: var(--color-primary);
  border-radius: 2px;
}

.title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-weight: 600;
  color: var(--color-primary);
  font-size: 18px;
  margin: 0;
}

.count {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text);
  background: rgba(80, 140, 134, .12);
  padding: 2px 8px;
  border-radius: 10px;
}

.body {
  display: flex;
  flex-direction: column;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(99, 149, 86, 0.12);
  color: var(--color-text);
  font-size: 13px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  transition: all 0.2s ease;
  cursor: pointer;
}

.tag:hover {
  background: rgba(99, 149, 86, 0.22);
  color: var(--color-heading);
}

.tag.active {
  background: rgba(99, 149, 86, 0.85);
  color: #fff;
}

.clear-tag {
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
}

.clear-tag:hover {
  text-decoration: underline;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  color: var(--color-text);
  opacity: .45;
  font-size: 13px;
  gap: 8px;
}

.empty-icon {
  font-size: 32px;
}
</style>
