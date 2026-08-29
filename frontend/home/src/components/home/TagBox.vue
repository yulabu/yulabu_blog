<template>
  <GlassPanel class="card">
    <div class="header">
      <span class="line"></span>
      <h4 class="title">标签</h4>
      <span class="count" v-if="tags.length">共 {{ tags.length }} 个</span>
      <button v-if="activeId" class="clear-tag" @click="onSelect(null)">全部</button>
    </div>
    <div class="body">
      <ContentState v-if="loading" kind="loading" size="compact">
        加载中...
      </ContentState>
      <ContentState
        v-else-if="!tags.length"
        kind="empty"
        size="compact"
        icon="material-symbols:label-off-outline"
      >
        暂无标签
      </ContentState>
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
  </GlassPanel>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getTags } from '@/api/tag'
import { useMessageBox } from '@/composables/useMessageBox'
import ContentState from '@/components/common/ContentState.vue'
import GlassPanel from '@/components/common/GlassPanel.vue'

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
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border-divider);
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
  background: rgba(var(--color-accent-rgb), .12);
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
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-text);
  font-size: 13px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  transition: all 0.2s ease;
  cursor: pointer;
}

.tag:hover {
  background: rgba(var(--color-primary-rgb), 0.22);
  color: var(--color-heading);
}

.tag.active {
  background: var(--color-primary);
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

</style>
