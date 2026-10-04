<template>
  <!--
    「桌面上的私人日记」的桌面：无箱体、无背板、无铭牌——一排排纤细布面书脊
    直接立在一薄木层板上，页面底色即背景。
    职责边界：本组件只管「桌面与布局」——层板、每行本数（构建期预渲染必须与
    客户端一致）；书脊的视觉与交互在 DiaryBook。
    书脊纤细（约 39px），一行 12 本；层板宽度由「书脊宽 + 书间距」反推（调参值）。
  -->
  <section
    class="relative mx-auto w-full max-w-[560px] [--book-h:clamp(140px,22vw,200px)] [--shelf-cols:12]"
    :aria-label="`日记书架，共 ${total} 篇`"
  >
    <ul class="relative z-[2] flex list-none flex-col gap-[30px]">
      <li v-for="(row, ri) in rows" :key="ri" class="relative pb-[11px]">
        <ul class="grid list-none grid-cols-[repeat(var(--shelf-cols),minmax(0,1fr))] items-end gap-x-[8px]">
          <li v-for="(diary, ci) in row" :key="diary.id" class="min-w-0">
            <DiaryBook :diary="diary" @open="onOpen(ri * COLS + ci, $event)" />
          </li>
        </ul>
        <!-- 层板：一条薄木（前沿受光、板下落影），书直接立在上面 -->
        <span
          class="absolute inset-x-[-12px] bottom-0 h-[10px] rounded-[3px] bg-shelf-ledge bg-[image:linear-gradient(180deg,rgba(255,255,255,0.3),rgba(255,255,255,0)_55%)] shadow-[0_2px_4px_-1px_rgba(20,24,18,0.35),0_10px_18px_-10px_rgba(20,24,18,0.5)]"
          aria-hidden="true"
        ></span>
      </li>
    </ul>

    <slot />
  </section>
</template>

<script setup>
import { computed } from 'vue'
import DiaryBook from '@/components/diary/DiaryBook.vue'

// 一层几本书：常量而不是按视口算——书架在构建期预渲染，切分方式必须与客户端
// 完全一致，否则水合错位。每页 20 篇 → 12 / 8 两层；书脊纤细后一行能容纳更多本。
const COLS = 12

const props = defineProps({
  diaries: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 }
})

const emit = defineEmits(['open'])

const rows = computed(() => {
  const list = props.diaries || []
  const out = []
  for (let i = 0; i < list.length; i += COLS) {
    out.push(list.slice(i, i + COLS))
  }
  return out
})

// 行内列号换算成整架序号：日记本里「翻到上/下一篇」要的是全局序
function onOpen(globalIndex, payload) {
  emit('open', { ...payload, index: globalIndex })
}
</script>

<!-- 空 style 块：防 @tailwindcss/vite 把无 style 块的 .vue 原始模板当 CSS 解析（实踩） -->
<style>
/* empty on purpose */
</style>
