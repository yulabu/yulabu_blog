#!/usr/bin/env node
/**
 * 前台分层护栏（零依赖、不连库、不占端口）—— 对应后端 server/scripts/check-layers.js 的思路：
 * 把「只能靠记忆守住的约定」变成会失败的断言。
 *
 * 用法：cd frontend/home && node scripts/check-frontend-layers.mjs
 *
 * 断言：
 *   ① api/ 与 utils/ 是纯的：不许 import 组件（.vue/.astro）或 stores
 *   ② components/ui/ 是通用原语：不许 import 业务（@/api、@/stores、@/islands）
 *   ③ Astro 模板里 import 的 .vue 必须带 client 指令（否则它被静默当静态件用），
 *      有意零 JS 的必须登记进 STATIC_VUE_ALLOW
 *   ④ fetch( 只许出现在 api/client.ts（URL 与传输的唯一出口）
 *   ⑤ process.env 只许出现在 api/client.ts（页面取数只走 @/api/*）
 *   ⑥ 依赖只能向下：islands/ 与 components/ 不许 import pages/；utils/ 与 api/ 不许 import components/
 *   ⑦ 弹层纪律：文件里出现 <Teleport 就必须同时出现 v-if（水合 mismatch 实踩）
 *   ⑧ 死路径：不许再 import 已删除的模块
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), 'src')
const errors = []
const checks = []

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else acc.push(full)
  }
  return acc
}

const files = walk(ROOT)
const rel = (f) => path.relative(process.cwd(), f)
const read = (f) => fs.readFileSync(f, 'utf8')

/** 逐行扫一个文件，命中正则就记录（返回 [行号, 行内容] 列表） */
function hits(file, re) {
  const out = []
  read(file)
    .split('\n')
    .forEach((line, i) => {
      re.lastIndex = 0
      if (re.test(line)) out.push([i + 1, line.trim()])
    })
  return out
}

function assert(name, fn) {
  const before = errors.length
  fn()
  checks.push([name, errors.length === before])
}

const importsOf = (file) => [...read(file).matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
const isSource = (f) => /\.(ts|vue|astro|js|mjs)$/.test(f)

// ① api/ 与 utils/ 保持纯净
assert('① api//utils/ 不依赖组件与 stores', () => {
  for (const f of files.filter((f) => /src\/(api|utils)\//.test(f))) {
    for (const [line, text] of hits(f, /from\s+['"](@\/(components|islands|stores)|\.\.\/(components|islands|stores)|[^'"]*\.vue|[^'"]*\.astro)['"]/)) {
      errors.push(`${rel(f)}:${line} 纯层引入了组件/store → ${text}`)
    }
  }
})

// ② components/ui 只放通用原语
assert('② components/ui 不依赖业务层', () => {
  for (const f of files.filter((f) => /src\/components\/ui\//.test(f))) {
    for (const [line, text] of hits(f, /from\s+['"]@\/(api|stores|islands|components\/(home|diary|post|about|common))\//)) {
      errors.push(`${rel(f)}:${line} 原语引入了业务模块 → ${text}`)
    }
  }
})

// ③ Astro 里的 Vue 组件必须显式声明要不要水合
// 有意零 JS 的：由 Astro 直接渲染成静态 HTML，本文件里的用法都带注释说明
const STATIC_VUE_ALLOW = {
  'src/components/astro/PageFrame.astro': ['PersonalCard'],
  // AppIcon 同步渲染 getIcon 的 body（SSR/客户端输出一致），本来就不需要水合，
  // 页脚用它渲染 GitHub/Email 图标是静态件用法
  'src/components/astro/SiteFooter.astro': ['AppIcon'],
}
assert('③ Astro 里 import 的 .vue 必须带 client 指令或登记为静态件', () => {
  for (const f of files.filter((f) => f.endsWith('.astro'))) {
    const body = read(f)
    const vueImports = [...body.matchAll(/import\s+(\w+)\s+from\s+['"][^'"]+\.vue['"]/g)].map((m) => m[1])
    for (const name of vueImports) {
      if (STATIC_VUE_ALLOW[rel(f)]?.includes(name)) continue
      // 该组件在被挂载时必须带 client:*
      const used = new RegExp(`<${name}[\\s>][^>]*client:|<${name}\\s+client:`, 's')
      if (!used.test(body)) {
        errors.push(`${rel(f)} 里的 <${name}> 没有 client 指令（要静态件就登记进 STATIC_VUE_ALLOW）`)
      }
    }
  }
})

// ④ fetch( 的唯一出口（API 传输只能走 client.ts）
// 例外：按需加载静态资源（不是后端 API）的文件，登记理由
const ASSET_FETCH_ALLOW = {
  // 动画光标 .ani 是 public/ 下的静态资源，首次指针交互才拉，与后端 API 无关
  'src/composables/useAnimatedCursor.ts': '静态资源按需加载',
}
assert('④ fetch( 只出现在 api/client.ts（资源加载已登记例外）', () => {
  for (const f of files.filter(isSource)) {
    if (rel(f).endsWith('src/api/client.ts') || ASSET_FETCH_ALLOW[rel(f)]) continue
    for (const [line, text] of hits(f, /\bfetch\s*\(/)) {
      errors.push(`${rel(f)}:${line} 出现裸 fetch → ${text}`)
    }
  }
})

// ⑤ process.env 的唯一出口
assert('⑤ process.env 只出现在 api/client.ts', () => {
  for (const f of files.filter(isSource)) {
    if (rel(f).endsWith('src/api/client.ts')) continue
    for (const [line, text] of hits(f, /process\.env/)) {
      errors.push(`${rel(f)}:${line} 直接读 process.env → ${text}`)
    }
  }
})

// ⑥ 依赖只能向下
assert('⑥ 依赖只能向下（islands/components 不引 pages；utils/api 不引 components）', () => {
  for (const f of files.filter(isSource)) {
    for (const [line, text] of hits(f, /from\s+['"]@\/(pages|layouts)\//)) {
      if (/src\/(islands|components)\//.test(f)) errors.push(`${rel(f)}:${line} 向下依赖被打破 → ${text}`)
    }
    for (const [line, text] of hits(f, /from\s+['"]@\/components\//)) {
      if (/src\/(utils|api)\//.test(f)) errors.push(`${rel(f)}:${line} 纯层引用了组件 → ${text}`)
    }
  }
})

// ⑦ Teleport 必须与 v-if 同现
// 例外：整岛 client:only 的弹层（SSR 期根本不渲染这个岛，不存在 mismatch 面）
const TELEPORT_ALLOW = {
  'src/components/common/ToastHost.vue': '整岛 client:only（Layout.astro 挂载时声明）',
}
assert('⑦ Teleport 与 v-if 同现（client:only 整岛已登记例外）', () => {
  for (const f of files.filter((f) => /\.(vue|astro)$/.test(f))) {
    const body = read(f)
    if (!body.includes('<Teleport')) continue
    if (TELEPORT_ALLOW[rel(f)]) continue
    const guarded = /<Teleport[^>]*v-if=/.test(body) || /v-if="isMounted"[\s\S]{0,200}<Teleport/.test(body)
    if (!guarded) errors.push(`${rel(f)} 用了 <Teleport> 但没有 v-if 守卫（水合 mismatch 实踩）`)
  }
})

// ⑧ 死路径
assert('⑧ 没有指向已删除模块的 import', () => {
  const dead = /from\s+['"](@\/(utils\/(http|serverData|ssrFetch)|types\/api|views\/)|[^'"]*main\.css)['"]/
  for (const f of files.filter(isSource)) {
    for (const [line, text] of hits(f, dead)) {
      errors.push(`${rel(f)}:${line} 引用了已删除的模块 → ${text}`)
    }
  }
})

console.log('前台分层护栏\n')
for (const [name, ok] of checks) console.log(`${ok ? '✅' : '❌'} ${name}`)
if (errors.length) {
  console.log('\n问题清单：')
  for (const e of errors) console.log(`  ✗ ${e}`)
  console.log(`\n✗ ${errors.length} 处违规`)
  process.exit(1)
}
console.log('\n✅ 全部通过')
