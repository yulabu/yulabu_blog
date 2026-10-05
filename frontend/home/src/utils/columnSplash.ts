// CD 转场信号：点击专栏光碟的瞬间跨页广播。
// 写入方（专栏架 CdCase 的点击）把被点条目与碟片的屏幕位置挂到 window 并广播
// 'yulabu:column-splash'；读取方是常驻岛 ColumnCdSplash.vue（transition:persist
// 跨页存活，在 columns 列表与详情两页声明），接收事件后从原位起飞、换页后第二幕淡出。
// 用 window 而非 sessionStorage：与 postSplash.ts 同理 —— ClientRouter 软导航只换
// document 内容、不销毁 window，同一 JS 堆内必然可达；直接访问 / 刷新 / 分享链接 /
// 爬虫没有点击信号，转场永不出现，退化为普通跳转。
declare global {
  interface Window {
    __yulabuColumnSplash?: {
      id: number | string
      name: string
      cover: string | null
      /** 被点碟片的屏幕快照（getBoundingClientRect），飞行碟的起点与直径 */
      rect: { x: number; y: number; d: number } | null
      t0: number
    } | null
  }
}

const SPLASH_EVENT = 'yulabu:column-splash'

export function markColumnSplash(
  column: { id: number | string; name?: string; cover?: string | null },
  discEl?: Element | null
) {
  const rect = discEl?.getBoundingClientRect()
  const payload = {
    id: column.id,
    name: column.name || '',
    cover: column.cover || null,
    // hover 抽碟态下取到的是已抽出的位置 —— 飞行碟正好从用户看到的现状起飞
    rect:
      rect && rect.width > 0
        ? { x: rect.left, y: rect.top, d: rect.width }
        : null,
    t0: Date.now(),
  }
  window.__yulabuColumnSplash = payload
  window.dispatchEvent(new CustomEvent(SPLASH_EVENT, { detail: payload }))
}
