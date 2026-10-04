<template>
  <!--
    单本日记的书脊（「桌面上的私人日记」）。
    职责：书脊的视觉与交互——hover / focus 抬起（--book-lift，接触影留在桌面松开），
    点击直接进入 DiaryNotebook 阅读全文（书脊矩形供飞入动画起飞）。
    书脊 = 布面（季节色）+ 竖排书名 + 叶子与竖排日期，四件落款之外无装饰：
    无封面层、无页缘断面、无季度角标（上两轮按用户要求移除——书就是一条纤细书脊）。
    触屏（hover:none）无抬升动画，点按直接进入日记本。
  -->
  <button
    ref="rootEl"
    class="group/book relative z-1 block h-[calc(var(--book-h)*var(--book-scale,1))] w-full cursor-pointer border-0 bg-transparent p-0 [--book-lift:0px] hover:z-[6] hover:[--book-lift:-10px] focus-visible:z-[6] focus-visible:[--book-lift:-10px] active:[--book-lift:-7px]"
    type="button"
    :aria-label="`${dateLabel} ${title}`"
    :style="{ '--book-scale': heightScale }"
    @click="handleClick"
  >
    <!-- 书脊：布面 + 极淡织纹，落款只有书名 / 叶子 / 日期 -->
    <div
      ref="spineEl"
      class="absolute inset-0 flex flex-col items-center overflow-hidden rounded-l-[4px] rounded-r-[2px] bg-[image:repeating-linear-gradient(0deg,rgba(255,255,255,0.055)_0_1px,transparent_1px_3px),repeating-linear-gradient(90deg,rgba(0,0,0,0.03)_0_1px,transparent_1px_3px)] shadow-[inset_0_0_0_1px_var(--book-pages-edge)] [transform:translateY(var(--book-lift,0px))] transition-transform duration-[320ms] ease-standard motion-reduce:transition-none"
      :class="surfaceClass"
    >
      <!-- 顶部留白必须用物理属性 mt（不能用 my-*：逻辑属性 margin-block 在
           vertical-rl 下解析为左右边距，书名会顶到书脊上沿——实踩） -->
      <span class="mt-[9px] mb-[9px] min-h-0 flex-1 overflow-hidden whitespace-nowrap text-start font-kai text-[12px] font-semibold leading-[1.15] tracking-[0.05em] text-book-ink [mask-image:linear-gradient(180deg,#000_78%,transparent)] [writing-mode:vertical-rl]">{{ spineTitle }}</span>
      <span class="mb-[7px] flex flex-col items-center gap-[4px] text-book-ink">
        <AppIcon icon="mdi:sprout" class="text-[10px] opacity-60" />
        <span class="text-[9px] tracking-[0.1em] opacity-75 [writing-mode:vertical-rl]">{{ dateMD }}</span>
      </span>
    </div>

    <!-- 接触影：hover 抬书时留在桌面松开（书离桌的证据） -->
    <span
      class="absolute right-[3%] bottom-[-2px] left-[3%] h-[6px] rounded-[50%] bg-[rgba(0,0,0,0.38)] opacity-50 blur-[3px] [transition:transform_0.32s_cubic-bezier(0.2,0.7,0.2,1),opacity_0.32s_ease] motion-reduce:transition-none group-hover/book:scale-x-[112%] group-hover/book:opacity-30 group-focus-visible/book:opacity-30"
      aria-hidden="true"
    ></span>
  </button>
</template>

<script setup>
import { computed, ref } from 'vue'
import { formatDateDot, formatDateMD } from '@/utils/date'
import { diaryHeightScale, diaryQuarter, diaryTitle } from '@/utils/diary'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps({
  diary: { type: Object, required: true }
})

const emit = defineEmits(['open'])

const rootEl = ref(null)
const spineEl = ref(null)

const title = computed(() => diaryTitle(props.diary))
const dateLabel = computed(() => formatDateDot(props.diary.created_at))
// 书脊底部竖排日期（北京月/日）
const dateMD = computed(() => formatDateMD(props.diary.created_at))
// 竖排书脊放不下时确定性直切（不加省略号：省略号会折出第二列，真实书脊也是直接断）
const spineTitle = computed(() => title.value.slice(0, 8))
// 高矮不齐才像真书架（书脊底部仍然对齐在同一块层板上）
const heightScale = computed(() => diaryHeightScale(props.diary.id))
// 布面按季节分色：值是 bg-book-cloth-N 工具类（字面量数组供 Tailwind 扫描），
// 色板本体在 tokens.css 的 --book-cloth-1..4，随主题自动换值
const CLOTH_CLASSES = ['bg-book-cloth-1', 'bg-book-cloth-2', 'bg-book-cloth-3', 'bg-book-cloth-4']
const surfaceClass = computed(() => CLOTH_CLASSES[diaryQuarter(props.diary.created_at)] || CLOTH_CLASSES[0])

function handleClick() {
  emit('open', {
    // 用书脊的矩形：日记本飞行入场要从"书真正在屏幕上的样子"起飞
    rect: spineEl.value ? spineEl.value.getBoundingClientRect() : null,
    el: rootEl.value
  })
}
</script>

<!-- 空 style 块：防 @tailwindcss/vite 把无 style 块的 .vue 原始模板当 CSS 解析（实踩） -->
<style>
/* empty on purpose */
</style>
