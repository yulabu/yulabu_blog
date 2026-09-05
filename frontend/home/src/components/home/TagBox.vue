<template>
  <GlassPanel class="card">
    <div class="header">
      <span class="heading-icon">
        <Icon icon="material-symbols:label-outline" />
      </span>
      <div class="heading-copy">
        <span class="heading-kicker">EXPLORE</span>
        <h4 class="title">标签</h4>
      </div>
      <span class="count" v-if="tags.length">
        <strong>{{ tags.length }}</strong>
        <small>个标签</small>
      </span>
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
          <span class="tag-name">{{ tag.name }}</span>
          <small class="tag-count">{{ tag.count }}</small>
        </span>
      </div>
    </div>
  </GlassPanel>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
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

const emit = defineEmits(['select', 'loaded'])

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
    emit('loaded')
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
  padding: 18px;
  border-radius: 20px;
}

.header {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-divider);
  margin-bottom: 15px;
}

.heading-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(var(--color-primary-rgb), .16);
  border-radius: 10px;
  background: rgba(var(--color-primary-rgb), .1);
  color: var(--color-primary);
  font-size: 18px;
}

.heading-copy {
  min-width: 0;
}

.heading-kicker {
  display: block;
  margin-bottom: 4px;
  color: var(--color-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .16em;
  line-height: 1;
}

.title {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-weight: 600;
  color: var(--color-heading);
  font-size: 17px;
  line-height: 1.2;
  margin: 0;
}

.count {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: auto;
  color: var(--color-muted);
  font-size: 9px;
  white-space: nowrap;
}

.count strong {
  color: var(--color-heading);
  font-family: Georgia, serif;
  font-size: 19px;
  line-height: 1;
}

.count small {
  margin-top: 3px;
  font-size: 9px;
}

.body {
  display: flex;
  flex-direction: column;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 9px 7px 11px;
  border: 1px solid rgba(var(--color-primary-rgb), .11);
  border-radius: 10px;
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-text);
  font-size: 13px;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  transition: background .2s ease, border-color .2s ease, color .2s ease, transform .2s ease;
  cursor: pointer;
}

.tag:hover {
  border-color: rgba(var(--color-primary-rgb), .26);
  background: rgba(var(--color-primary-rgb), 0.16);
  color: var(--color-heading);
  transform: translateY(-1px);
}

.tag.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}

.tag-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 19px;
  height: 19px;
  padding: 0 4px;
  border-radius: 7px;
  background: rgba(var(--color-primary-rgb), .12);
  color: var(--color-primary);
  font-family: Georgia, serif;
  font-size: 11px;
  line-height: 1;
}

.tag.active .tag-count {
  background: rgba(255, 255, 255, .2);
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

/* ===== 移动端：水平滚动标签栏 ===== */
@media (max-width: 768px) {
  .card {
    padding: 12px;
    border-radius: 16px;
  }

  .header {
    display: none;
  }

  .body {
    margin: 0;
  }

  .tag-list {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 2px 0;
  }

  .tag-list::-webkit-scrollbar {
    display: none;
  }

  .tag {
    flex-shrink: 0;
    padding: 6px 12px;
    font-size: 13px;
    white-space: nowrap;
  }

  .tag-count {
    font-size: 11px;
  }
}
</style>
