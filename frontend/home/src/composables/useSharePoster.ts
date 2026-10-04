import { ref } from 'vue'

/**
 * 分享海报绘制（纯浏览器 Canvas，无框架/组件依赖，只在客户端执行）。
 *
 * 版式（参考站内分享卡风格）：5:6 白底圆角卡——封面满铺到顶、左下角日期角标
 * （大号日 + 年 月）、标题、竖条摘要、分隔线、头像/作者/站名 + 右侧二维码、
 * 左下角装饰圆。计划 v8 的硬性规格都落在本文件：
 * - **qrcode 包只允许调用 create() 取模块矩阵**；其自带的 toCanvas / toDataURL /
 *   toString 等默认渲染器输出方块模块，禁止作为最终海报码——圆点模块一律由
 *   drawQrDots 自绘（三个定位角画成圆角方块环，点化会伤扫码率）。
 * - **封面加载考虑 CORS**：跨域 URL 一律以 crossOrigin='anonymous' 尝试；加载失败 /
 *   CORS 拒绝 / 解码失败 / 4s 超时都返回 null → 封面区降级为「浅绿底 + 标题首字」，
 *   绝不 fail 整张海报。
 * - **导出双保险**：万一画布被跨域图污染（toDataURL 抛 SecurityError），换兜底封面
 *   重绘再导出一次。
 * - 字体：绘制前按实际文案 document.fonts.load 文楷，2.5s 内没就绪就降级系统字体，
 *   不阻塞出图。
 *
 * 配色固定为字面量（Canvas 读不到 CSS 变量）：白底黑字的中性卡面 + 站点薄荷绿点缀，
 * 分享物是给别人的稳定观感，不随访客亮暗主题变。
 */

const LOGICAL_W = 900
const LOGICAL_H = 1080
/** @2x 导出，手机保存后不发虚 */
const SCALE = 2
const COVER_TIMEOUT_MS = 4000
const FONT_TIMEOUT_MS = 2500
const PALETTE = {
  ink: '#2c352e', // 标题/署名
  gray: '#8a938c', // 摘要/小标签
  divider: '#e9ede9',
  badgeBg: 'rgba(28, 38, 32, 0.52)', // 封面日期角标
  white: '#ffffff',
  qrInk: '#1f2a22',
  mintSoft: 'rgba(99, 149, 86, 0.1)', // 装饰圆
  coverTint: 'rgba(99, 149, 86, 0.12)', // 首字兜底封面底
  coverInk: 'rgba(99, 149, 86, 0.45)'
}
const KAI = '"LXGW WenKai", "Microsoft YaHei", "PingFang SC", sans-serif'
const UI = '"Microsoft YaHei", "PingFang SC", sans-serif'

export interface SharePosterOptions {
  title: string
  /** 无摘要传空串，海报自动跳过摘要块 */
  summary: string
  /** 无封面/封面不可安全绘制时传空串或跨域地址，均降级为首字封面 */
  coverUrl: string
  author: string
  /** 北京日期 YYYY-MM-DD（formatDate 产物）；角标取「日」与「年 月」 */
  dateText: string
  siteName: string
  avatarUrl: string
  /** 二维码内容 = 分享链接（与弹层展示的链接文本同一个来源） */
  qrText: string
}

export function useSharePoster() {
  const generating = ref(false)
  const posterUrl = ref('')
  const error = ref('')

  async function generate(options: SharePosterOptions): Promise<string> {
    generating.value = true
    error.value = ''
    try {
      const url = await renderSharePoster(options)
      posterUrl.value = url
      return url
    } catch (e) {
      posterUrl.value = ''
      error.value = '海报生成失败，请重试'
      throw e
    } finally {
      generating.value = false
    }
  }

  return { generating, posterUrl, error, generate }
}

async function renderSharePoster(o: SharePosterOptions): Promise<string> {
  const qr = await loadQrMatrix(o.qrText)
  await loadPosterFonts(o)
  const [avatar, cover] = await Promise.all([
    loadImageSafe(o.avatarUrl, false),
    loadCoverSafe(o.coverUrl)
  ])

  const canvas = document.createElement('canvas')
  canvas.width = LOGICAL_W * SCALE
  canvas.height = LOGICAL_H * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context 不可用')
  ctx.scale(SCALE, SCALE)

  // 导出双保险：封面污染画布时换兜底封面重绘再导出（正常路径到不了第二个分支——
  // 跨域图在加载阶段就要求匿名 CORS 成功，被拒时封面已是 null）
  const covers: (HTMLImageElement | null)[] = cover ? [cover, null] : [null]
  let lastError: unknown = new Error('海报导出失败')
  for (const coverImg of covers) {
    drawPoster(ctx, o, qr, coverImg, avatar)
    try {
      return canvas.toDataURL('image/png')
    } catch (e) {
      lastError = e
      if (coverImg && isTaintError(e)) {
        console.warn('[poster] 封面跨域污染画布，已降级为首字封面重新导出')
        continue
      }
      throw e
    }
  }
  throw lastError
}

/** qrcode 包唯一允许的用法：create() 取模块矩阵 */
async function loadQrMatrix(text: string) {
  const { create } = await import('qrcode')
  return create(text, { errorCorrectionLevel: 'M' }).modules
}

/** 按海报里的实际文案预载文楷（字体按 unicode-range 分包，text 决定拉哪些子集）；
 *  超时/失败都不阻塞，Canvas 自然回落到字体栈里的系统字体 */
async function loadPosterFonts(o: SharePosterOptions) {
  if (typeof document === 'undefined' || !document.fonts) return
  const loads = [
    document.fonts.load(`700 44px ${KAI}`, `${o.title} ${o.siteName} ${o.author}`),
    document.fonts.load(`400 26px ${KAI}`, o.summary)
  ]
  await Promise.race([
    Promise.allSettled(loads),
    new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS))
  ]).catch(() => {})
}

function loadImage(url: string, crossOrigin: boolean, timeoutMs: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = 'anonymous'
    const timer = setTimeout(() => {
      img.onload = null
      img.onerror = null
      reject(new Error(`图片加载超时：${url}`))
    }, timeoutMs)
    img.onload = () => {
      clearTimeout(timer)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      reject(new Error(`图片加载失败：${url}`))
    }
    img.src = url
  })
}

function isSameOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin === window.location.origin
  } catch {
    return false
  }
}

/** 封面加载（计划硬性规格）：跨域一律匿名 CORS；任何失败都降级为 null（首字封面） */
async function loadCoverSafe(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null
  try {
    return await loadImage(url, !isSameOrigin(url), COVER_TIMEOUT_MS)
  } catch (e) {
    console.warn(`[poster] 封面未能安全加载，已降级为首字封面（${(e as Error).message}）`)
    return null
  }
}

/** 头像与封面同款守卫，只是失败时静默（有首字兜底） */
async function loadImageSafe(url: string, crossOrigin: boolean): Promise<HTMLImageElement | null> {
  if (!url) return null
  try {
    return await loadImage(url, crossOrigin, COVER_TIMEOUT_MS)
  } catch {
    return null
  }
}

function isTaintError(e: unknown): boolean {
  const name = (e as DOMException)?.name ?? ''
  const message = String((e as Error)?.message ?? '')
  return name === 'SecurityError' || /tainted|security/i.test(message)
}

// ---- 绘制（逻辑坐标 900×1080，ctx 已按 @2x 缩放）----

function drawPoster(
  ctx: CanvasRenderingContext2D,
  o: SharePosterOptions,
  qr: { size: number; data: Uint8Array },
  cover: HTMLImageElement | null,
  avatar: HTMLImageElement | null
) {
  const W = LOGICAL_W
  const H = LOGICAL_H
  const PAD = 48
  const COVER_H = 560

  ctx.clearRect(0, 0, W, H)
  ctx.save()
  // 整卡圆角（导出 PNG 四角透明）
  roundRect(ctx, 0, 0, W, H, 28)
  ctx.clip()

  // 卡面白底 + 左下装饰圆（裁在卡内）
  ctx.fillStyle = PALETTE.white
  ctx.fillRect(0, 0, W, H)
  ctx.beginPath()
  ctx.arc(30, H - 30, 84, 0, Math.PI * 2)
  ctx.fillStyle = PALETTE.mintSoft
  ctx.fill()

  // 封面满铺到顶
  if (cover) drawCoverImage(ctx, cover, 0, 0, W, COVER_H)
  else drawFallbackCover(ctx, o.title, 0, 0, W, COVER_H)

  // 日期角标：贴封面左下（大号日 + 年 月）
  const date = parseDateParts(o.dateText)
  if (date) drawDateBadge(ctx, date, 24, COVER_H - 100)

  // 标题：最多两行，超出省略
  const titleTop = COVER_H + 56
  const titleLines = wrapText(ctx, o.title, `700 44px ${KAI}`, W - PAD * 2, 2)
  ctx.fillStyle = PALETTE.ink
  ctx.font = `700 44px ${KAI}`
  ctx.textBaseline = 'top'
  titleLines.forEach((line, i) => ctx.fillText(line, PAD, titleTop + i * 58))

  // 摘要：左侧竖条 + 最多两行（无摘要自动跳过）
  if (o.summary) {
    const summaryTop = titleTop + titleLines.length * 58 + 22
    const summaryLines = wrapText(ctx, o.summary, `400 26px ${KAI}`, W - PAD * 2 - 16, 2)
    roundRect(ctx, PAD, summaryTop + 5, 4, summaryLines.length * 40 - 10, 2)
    ctx.fillStyle = PALETTE.divider
    ctx.fill()
    ctx.fillStyle = PALETTE.gray
    ctx.font = `400 26px ${KAI}`
    summaryLines.forEach((line, i) => ctx.fillText(line, PAD + 16, summaryTop + i * 40))
  }

  // 分隔线（位置固定：内容不足时空白留在上方，与参考版式一致）
  const dividerY = 866
  ctx.fillStyle = PALETTE.divider
  ctx.fillRect(PAD, dividerY, W - PAD * 2, 1)

  // 底部：头像 + 作者/扫码两段署名 + 右侧二维码
  const avatarD = 96
  const avatarY = dividerY + 40
  drawAvatar(ctx, avatar, PAD, avatarY, avatarD)

  const textX = PAD + avatarD + 26
  const col = [
    { text: '作者', font: `400 20px ${UI}`, color: PALETTE.gray, y: avatarY - 14 },
    { text: o.author, font: `700 30px ${KAI}`, color: PALETTE.ink, y: avatarY + 10 },
    { text: '扫码阅读', font: `400 20px ${UI}`, color: PALETTE.gray, y: avatarY + 52 },
    { text: o.siteName, font: `700 30px ${KAI}`, color: PALETTE.ink, y: avatarY + 76 }
  ]
  ctx.textBaseline = 'top'
  for (const item of col) {
    ctx.fillStyle = item.color
    ctx.font = item.font
    ctx.fillText(item.text, textX, item.y)
  }

  drawQrDots(ctx, qr, W - PAD - 148, avatarY - 21, 148, PALETTE.qrInk)

  ctx.restore()
}

/** 'YYYY-MM-DD' → { day: '7', yearMonth: '2026 09' }；解析失败返回 null（角标隐藏） */
function parseDateParts(dateText: string): { day: string; yearMonth: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateText ?? '').trim())
  if (!m) return null
  return { day: String(Number(m[3])), yearMonth: `${m[1]} ${m[2]}` }
}

function drawDateBadge(
  ctx: CanvasRenderingContext2D,
  date: { day: string; yearMonth: string },
  x: number,
  y: number
) {
  const size = 100
  roundRect(ctx, x, y, size, size, 10)
  ctx.fillStyle = PALETTE.badgeBg
  ctx.fill()
  ctx.fillStyle = PALETTE.white
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = `700 46px ${UI}`
  ctx.fillText(date.day, x + size / 2, y + 12)
  ctx.fillRect(x + 22, y + 66, size - 44, 1)
  ctx.font = `400 17px ${UI}`
  ctx.fillText(date.yearMonth, x + size / 2, y + 74)
  ctx.textAlign = 'left'
}

/** 圆点码自绘：普通模块为圆（半径 ≈0.35 模块），三个 7×7 定位角画成
 *  「圆角方块环」——定位图案必须保持连通轮廓，全部点化会明显伤扫码率 */
function drawQrDots(
  ctx: CanvasRenderingContext2D,
  qr: { size: number; data: Uint8Array },
  x: number,
  y: number,
  size: number,
  ink: string
) {
  const n = qr.size
  const cell = size / n
  const r = cell * 0.35
  const corners: [number, number][] = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0]
  ]
  const inFinder = (row: number, col: number) =>
    corners.some(([fy, fx]) => row >= fy && row < fy + 7 && col >= fx && col < fx + 7)

  ctx.fillStyle = ink
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!qr.data[row * n + col] || inFinder(row, col)) continue
      ctx.beginPath()
      ctx.arc(x + col * cell + cell / 2, y + row * cell + cell / 2, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  for (const [fy, fx] of corners) {
    const bx = x + fx * cell
    const by = y + fy * cell
    roundRect(ctx, bx, by, cell * 7, cell * 7, cell * 2)
    ctx.fill()
    ctx.fillStyle = PALETTE.white
    roundRect(ctx, bx + cell, by + cell, cell * 5, cell * 5, cell * 1.4)
    ctx.fill()
    ctx.fillStyle = ink
    roundRect(ctx, bx + cell * 2, by + cell * 2, cell * 3, cell * 3, cell)
    ctx.fill()
  }
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  avatar: HTMLImageElement | null,
  x: number,
  y: number,
  d: number
) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2)
  ctx.clip()
  if (avatar) {
    const s = Math.max(d / avatar.naturalWidth, d / avatar.naturalHeight)
    const dw = avatar.naturalWidth * s
    const dh = avatar.naturalHeight * s
    ctx.drawImage(avatar, x + (d - dw) / 2, y + (d - dh) / 2, dw, dh)
  } else {
    ctx.fillStyle = PALETTE.coverTint
    ctx.fillRect(x, y, d, d)
    ctx.fillStyle = PALETTE.coverInk
    ctx.font = `700 40px ${UI}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Y', x + d / 2, y + d / 2 + 2)
    ctx.textAlign = 'left'
  }
  ctx.restore()
  ctx.beginPath()
  ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)'
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * s
  const dh = img.naturalHeight * s
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}

/** 无封面兜底（对齐 CoverFallback 语义）：浅绿底 + 标题首字 */
function drawFallbackCover(
  ctx: CanvasRenderingContext2D,
  title: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.fillStyle = PALETTE.coverTint
  ctx.fillRect(x, y, w, h)
  const ch = [...(title || '').trim()][0] || '文'
  ctx.fillStyle = PALETTE.coverInk
  ctx.font = `700 180px ${KAI}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(ch, x + w / 2, y + h / 2)
  ctx.textAlign = 'left'
}

/** 逐字符贪心换行（中文按字断行；长文封顶后提前退出），超行省略号收尾 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidth: number,
  maxLines: number
): string[] {
  ctx.font = font
  const chars = [...String(text ?? '').trim()]
  const lines: string[] = []
  let line = ''
  for (const ch of chars) {
    const next = line + ch
    if (ch === '\n' || (line && ctx.measureText(next).width > maxWidth)) {
      lines.push(line)
      if (lines.length > maxLines) break
      line = ch === '\n' ? '' : ch
    } else {
      line = next
    }
  }
  if (line && lines.length <= maxLines) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
  kept[maxLines - 1] = `${last}…`
  return kept
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
