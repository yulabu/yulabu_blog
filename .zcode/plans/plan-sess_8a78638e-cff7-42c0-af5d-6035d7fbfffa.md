两处都很小，改动清单如下。

## 1. 日记页接入常驻卡片（+ 顺带把常驻链延长到日记页）

- `pages/diary.astro` 改用 `PageFrame`（与首页/归档同一套骨架）：`subtitle="日记" showTyping={false}`。
  - 于是左栏出现，`transition:persist="personal-card"` 在日记页也存在 → **首页 ↔ 归档 ↔ 日记 三页之间卡片都是同一个 DOM 节点**，整块搬运、位置不变。
  - 日记页 rail 槽留空（左栏只放卡片，和归档页一致）。
- `views/DiaryView.vue` 去掉 `SitePageFrame`，退化为纯内容（与已迁移的 `ArchiveView` 同处理）。
  - 根节点改为 `<main class="diary-layout">`（灯箱 Teleport 留在其中，`v-if="isMounted"` 守卫不动）。
  - `.diary-layout` 去掉自己的 `padding`（骨架已提供 `28px / var(--page-padding) / 64px`）与 `--page-padding` 重复叠加；保留 `max-width: 720px; margin: 0 auto`，正文仍居中在内容列里。
- 不改日记的卡片、排版、灯箱、分页任何外观。

## 2. 音乐播放器在日记页也完全展开

- `components/common/MusicPlayer.vue`：展开判定由「只认首页」改为**展开页白名单** `EXPAND_PATHS = ['/', '/diary']`，并归一化尾部斜杠（`/diary/` 也要命中）。
  - 变量 `isHome` → `expandRoute`，`updateIsHome` → `updateExpandRoute`（`astro:after-swap` 的注册/注销同步改名）。
  - 判定条件仍保留 `&& !isMobile`：**移动端依旧是迷你条**（窄屏放不下 300px 面板）。桌面端在首页与日记页完全展开，其余页面（归档/专栏/友链/关于/文章页）仍是迷你条。
- 播放状态本来就靠 `transition:persist` 跨页存活，此次只改"在哪几页展开"。

## 3. 页脚 GitHub / 邮箱居中

- `components/astro/SiteFooter.astro` 改为**居中竖排**：站名 → GitHub/Email 图标行 → 版权，三者水平居中（`align-items: center` + 居中文案）。
  - 内容仍只有这三样，**不放导航链接**（维持你上次的要求）。
  - 图标热区保持 44×44；顶部品牌色渐隐发丝线与不透明底色（暗色下不漏白）都保留。
- 如果你其实只想让"图标那一行"居中、站名与版权仍靠左，说一声我改成那种排布（差别很小）。

## 验证方式

- `npm run build` + `npm run check` 0 error
- **三页常驻实证**：首页滚动 → 归档 → 日记，逐段用节点标记验证 `sameNode === true`、`absTop/left/尺寸` 全程一致；反向（日记 → 归档 → 首页）同样验证
- Hero 回归（全屏 → 折叠 360 → Navbar 出现 → 老访客首帧不弹跳）不受影响
- 音乐播放器：桌面端首页与日记页是展开面板、其余页面是迷你条；移动端（≤768）恒为迷你条
- 页脚：1440 / 390 两档 × 明暗两态下居中、图标 44×44、对比度 ≥4.5:1（沿用上次的按层合成实测法）
- 控制台 8 个页面无新增 warning/error（重点看日记页新骨架的水合）
