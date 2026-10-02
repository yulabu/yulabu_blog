<template>
  <div class="content-state" :class="[`content-state--${kind}`, `content-state--${size}`]">
    <AppIcon v-if="icon" :icon="icon" class="content-state__icon" />
    <span><slot /></span>
    <button v-if="retryText" type="button" class="content-state__retry" @click="$emit('retry')">
      {{ retryText }}
    </button>
  </div>
</template>

<script setup>
/**
 * 空 / 加载 / 失败三种状态块（全站唯一实现，8 处在用）。
 * kind 是语义标签：empty / loading 只影响类名（观感与改前一致），error 会把文字转成危险色；
 * retryText 有值时多一个重试按钮 —— 「请求失败」不再只有一句 toast，页面上留着可重试的出口。
 */
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps({
  /** 有文案才渲染重试按钮（如「重新加载」）；点击 emit('retry') */
  retryText: {
    type: String,
    default: ''
  },
  kind: {
    type: String,
    default: 'empty'
  },
  size: {
    type: String,
    default: 'default'
  },
  icon: {
    type: String,
    default: ''
  }
})

defineEmits(['retry'])
</script>

<style scoped>
.content-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--color-text);
  font-size: 14px;
  opacity: .6;
  text-align: center;
}

.content-state--page {
  padding: 60px 0;
}

.content-state--panel {
  padding: 40px 0;
}

.content-state--compact {
  padding: 20px 0;
  font-size: 13px;
  opacity: .45;
}

.content-state__icon {
  margin-bottom: 8px;
  font-size: 32px;
}

/* 失败态：不再用低透明度糊过去，给一个明确的颜色和出口 */
.content-state--error {
  opacity: 1;
  color: var(--color-danger);
}

.content-state__retry {
  margin-top: 12px;
  padding: 6px 18px;
  border: 1px solid var(--border-divider);
  border-radius: 10px;
  background: var(--bg-card-strong);
  color: var(--color-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.content-state__retry:hover {
  background: var(--color-primary);
  color: #fff;
}
</style>
