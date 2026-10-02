<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    aria-hidden="true"
    role="img"
    style="width: 1em; height: 1em"
    viewBox="0 0 24 24"
    v-html="body"
  ></svg>
</template>

<script setup>
// 同步渲染的离线图标：数据来自 src/assets/icons.json（_app.ts / Layout.astro 已注册）。
// 不用 @iconify/vue 的 Icon 组件——它靠异步 watcher 更新数据，SSR 首帧只会输出
// 占位 svg，与客户端水合不一致（mismatch + 图标 pop-in）；本组件两侧同步渲染、
// 输出完全一致。
// 已知小瑕疵：SSR 输出中 viewBox 被序列化为小写 viewbox——Vue SSR 编译器对
// 带动态属性合并（class 透传 _attrs）的元素走 ssrRenderAttrs 且不传 svg tag，
// 一律小写。HTML 解析时浏览器按规范自动纠正为 viewBox，水合比较的也是解析后的
// DOM，功能零影响，故不做额外处理。子集图标全部为 24×24（build-icons.mjs 校验）。
// 新增图标后跑 npm run icons 重新生成子集。
import { computed } from 'vue'
import { getIcon } from '@iconify/vue'

const props = defineProps({
  icon: {
    type: String,
    default: ''
  }
})

const body = computed(() => {
  if (!props.icon) return ''
  const data = getIcon(props.icon)
  return data ? data.body : ''
})
</script>
