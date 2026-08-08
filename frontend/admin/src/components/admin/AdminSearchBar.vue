<template>
  <div class="admin-search-bar">
    <Icon icon="material-symbols:search" class="search-icon" />
    <input
      v-model="query"
      type="text"
      :placeholder="placeholder"
      class="search-input"
      @keyup.enter="emitSearch"
    />
    <button v-if="query" class="clear-btn" @click="onClear">
      <Icon icon="material-symbols:close" />
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  placeholder: {
    type: String,
    default: '搜索...'
  },
  debounce: {
    type: Number,
    default: 300
  }
})

const emit = defineEmits(['search'])

const query = ref('')
let timer = null

function emitSearch() {
  if (timer) clearTimeout(timer)
  emit('search', query.value.trim())
}

function onClear() {
  query.value = ''
  if (timer) clearTimeout(timer)
  emit('search', '')
}

watch(query, () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(emitSearch, props.debounce)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.admin-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.03);
  transition: border-color 0.2s ease, background 0.2s ease;
}

.admin-search-bar:focus-within {
  border-color: rgba(99, 149, 86, 0.4);
  background: rgba(99, 149, 86, 0.04);
}

.search-icon {
  font-size: 16px;
  color: var(--color-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--color-text);
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.search-input::placeholder {
  color: var(--color-muted);
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.1);
  color: var(--color-muted);
  cursor: pointer;
  padding: 0;
  font-size: 12px;
  transition: background 0.2s ease;
}

.clear-btn:hover {
  background: rgba(0, 0, 0, 0.2);
}
</style>
