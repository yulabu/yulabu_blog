import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'astro/config'
import vue from '@astrojs/vue'
import node from '@astrojs/node'
import tailwindcss from '@tailwindcss/vite'

// astro.config 不会自动加载 .env，这里手动读取（dev 代理仅本地开发使用）
function loadDevEnv() {
  const env = {}
  for (const file of ['.env', '.env.local', '.env.development']) {
    const full = path.resolve(process.cwd(), file)
    if (!fs.existsSync(full)) continue
    for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
      const m = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/.exec(line)
      if (m && !(m[1] in env)) env[m[1]] = (m[2] || '').replace(/^["']|["']$/g, '')
    }
  }
  return env
}

const target = loadDevEnv().VITE_API_TARGET || 'http://localhost:3000'

// 注意：Astro 7 加载 .mjs 配置时不求值函数式 defineConfig，必须以静态对象导出
// https://astro.build/config
export default defineConfig({
  site: 'https://blog.yulabu.cn',
  // 默认静态预渲染；文章页/专栏详情页通过 export const prerender = false 走 SSR
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [vue({ appEntrypoint: '/src/islands/_app' })],
  build: {
    // 字体 CSS 已单独拆出（见 Layout.astro），每页剩下的样式只有约 11 KB，
    // 内联进 HTML 后首屏不再有任何渲染阻塞样式表请求
    inlineStylesheets: 'always',
  },
  // MPA 下的 SPA 手感：全站链接 hover 预取（含 SSR 文章页）
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  server: {
    port: 5174,
  },
  vite: {
    // Tailwind v4 的官方接法是 Vite 插件（@astrojs/tailwind 是 v3 时代的集成）。
    // 样式入口 src/styles/global.css：只引 theme + utilities，不引 preflight，
    // reset 由我们自己声明（理由见该文件顶部注释）。
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      // 固化文章岛重依赖的预包，减少 dev 重启/配置变更后的 504 (Outdated Optimize Dep)
      include: ['md-editor-v3'],
    },
    server: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
        '/uploads': {
          target,
          changeOrigin: true,
        },
      },
    },
  },
})
