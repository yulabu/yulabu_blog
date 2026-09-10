// 从 @iconify-json/* 集合包抽取全站用到的图标子集，生成 src/assets/icons.json（入库）。
// 全集合有 8MB+，绝不能整体进 bundle；子集只含实际用到的图标（约 20KB）。
// 新增/更换图标后：在下方 ICONS 里登记名字，然后运行 npm run icons。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// 全站图标清单（与模板中 icon="..." / :icon="..." 的取值保持同步）
const ICONS = {
  'material-symbols': [
    // TagBox
    'label-outline', 'label-off-outline',
    // Pagination
    'chevron-left', 'chevron-right',
    // PersonalCard / PostList
    'auto-awesome', 'edit-note', 'article-outline', 'close',
    'description-outline', 'arrow-outward-rounded', 'person-outline',
    'schedule-outline', 'arrow-forward-rounded',
    // Navbar
    'search', 'menu', 'dark-mode', 'light-mode',
    // MusicPlayer
    'keyboard-arrow-down', 'music-note-rounded', 'pause-rounded',
    'play-arrow-rounded', 'volume-up-outline-rounded',
    // ArchiveView / PostDetailView
    'visibility-outline',
  ],
  mdi: [
    // AboutNode / AboutView
    'close', 'github', 'email', 'account-heart', 'school', 'notebook', 'message-text',
  ],
}

// 抽取子集：图标直接复制；别名先解析出 parent（递归），再原样复制别名属性
function subsetCollection(full, names) {
  const out = {
    prefix: full.prefix,
    icons: {},
    aliases: {},
  }
  // 集合级默认尺寸必须带上，否则子集图标丢失默认宽高
  for (const key of ['width', 'height', 'left', 'top']) {
    if (full[key] !== undefined) out[key] = full[key]
  }
  const missing = []

  const resolve = (name, depth = 0) => {
    if (full.icons[name]) {
      out.icons[name] = full.icons[name]
      return true
    }
    const alias = full.aliases && full.aliases[name]
    if (alias && depth < 8) {
      if (!resolve(alias.parent, depth + 1)) return false
      out.aliases[name] = { ...alias }
      return true
    }
    return false
  }

  for (const name of names) {
    if (!resolve(name)) missing.push(`${full.prefix}:${name}`)
  }
  if (missing.length) {
    console.error(`[build-icons] 集合包中找不到以下图标，请核对名称：\n  ${missing.join('\n  ')}`)
    process.exit(1)
  }
  // AppIcon.vue 的 viewBox 固定 0 0 24 24，子集图标必须全部为 24×24
  if (full.width !== 24 || full.height !== 24) {
    console.error(`[build-icons] 集合 ${full.prefix} 根尺寸不是 24×24（${full.width}×${full.height}），需同步调整 AppIcon 的 viewBox`)
    process.exit(1)
  }
  const nonSquare = Object.entries(out.icons).filter(([, v]) => (v.width && v.width !== 24) || (v.height && v.height !== 24))
  const badAlias = Object.entries(out.aliases || {}).filter(([, v]) => (v.width && v.width !== 24) || (v.height && v.height !== 24))
  if (nonSquare.length || badAlias.length) {
    console.error(`[build-icons] 存在非 24×24 尺寸的图标，请核对：`, [...nonSquare, ...badAlias].map(([n]) => n))
    process.exit(1)
  }
  if (!Object.keys(out.aliases).length) delete out.aliases
  return out
}

const collections = {}
for (const [prefix, names] of Object.entries(ICONS)) {
  const full = JSON.parse(fs.readFileSync(path.resolve(root, `node_modules/@iconify-json/${prefix}/icons.json`), 'utf8'))
  collections[prefix] = subsetCollection(full, names)
}

const outPath = path.resolve(root, 'src/assets/icons.json')
fs.writeFileSync(outPath, JSON.stringify(collections))
const total = Object.values(collections).reduce((n, c) => n + Object.keys(c.icons).length + Object.keys(c.aliases || {}).length, 0)
console.log(`[build-icons] 已生成 ${path.relative(root, outPath)}：${total} 个图标，${Math.round(fs.statSync(outPath).size / 1024)} KB`)
