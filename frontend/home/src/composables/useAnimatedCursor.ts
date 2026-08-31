import { convertAniBinaryToCSS } from 'ani-cursor'

const CURSOR_MAP: Record<string, string> = {
  '*': '/cursor/arrow.ani',
  'a, button, [role="link"], [role="button"]': '/cursor/link.ani',
  'input, textarea, [contenteditable], select': '/cursor/beam.ani',
  '[disabled], .disabled, [data-cursor="no"]': '/cursor/no.ani',
  'canvas, [data-cursor="cross"]': '/cursor/cross.ani',
  '[draggable="true"], [data-cursor="move"]': '/cursor/move.ani',
  '[data-resize="nesw"]': '/cursor/nesw.ani',
  '[data-resize="ns"]': '/cursor/ns.ani',
  '[data-resize="nwse"]': '/cursor/nwse.ani',
  '[data-resize="we"]': '/cursor/we.ani',
  '.is-working, [data-working]': '/cursor/working.ani',
}

const LOADING_SELECTOR = '.is-loading, .is-loading *'
const LOADING_CURSOR = '/cursor/busy.ani'

const FRAME_URL_RE = /url\((data:image\/x-win-bitmap;base64,[^)]+)\)/g

interface CursorEntry {
  selector: string
  frames: string[]
  styleEl: HTMLStyleElement
  frameIndex: number
}

async function fetchAni(url: string): Promise<Uint8Array> {
  const resp = await fetch(url)
  const buf = await resp.arrayBuffer()
  return new Uint8Array(buf)
}

function extractFrameUrls(css: string): string[] {
  const frames: string[] = []
  let match: RegExpExecArray | null
  while ((match = FRAME_URL_RE.exec(css)) !== null) {
    const url = match[1]
    if (url) frames.push(url)
  }
  return frames
}

function injectStyle(css: string): HTMLStyleElement {
  const el = document.createElement('style')
  el.textContent = css
  document.head.appendChild(el)
  return el
}

function buildStaticCSS(selector: string, dataUri: string): string {
  return `${selector} { cursor: url(${dataUri}), auto !important; }`
}

export function useAnimatedCursor() {
  const entries: CursorEntry[] = []
  let loadingEntry: CursorEntry | null = null
  let animTimer: ReturnType<typeof setInterval> | null = null

  async function initCursors() {
    const tasks = Object.entries(CURSOR_MAP).map(async ([selector, aniUrl]) => {
      try {
        const data = await fetchAni(aniUrl)
        const css = convertAniBinaryToCSS(selector, data)
        const frames = extractFrameUrls(css)
        return { selector, frames }
      } catch (e) {
        console.warn(`[cursor] 加载失败: ${aniUrl}`, e)
        return null
      }
    })

    const results = await Promise.all(tasks)

    for (const result of results) {
      if (!result || result.frames.length === 0) continue

      const { selector, frames } = result
      const firstFrame = frames[0]
      if (!firstFrame) continue
      const styleEl = injectStyle(buildStaticCSS(selector, firstFrame))

      entries.push({ selector, frames, styleEl, frameIndex: 0 })
    }

    if (entries.length > 0) {
      startAnimation()
    }
  }

  function startAnimation() {
    if (animTimer) return
    animTimer = setInterval(() => {
      for (const entry of entries) {
        if (entry.frames.length <= 1) continue
        entry.frameIndex = (entry.frameIndex + 1) % entry.frames.length
        const frame = entry.frames[entry.frameIndex]
        if (frame) {
          entry.styleEl.textContent = buildStaticCSS(entry.selector, frame)
        }
      }
    }, 100)
  }

  function setLoadingCursor(active: boolean) {
    if (active) {
      if (loadingEntry) return
      fetchAni(LOADING_CURSOR)
        .then((data) => {
          const css = convertAniBinaryToCSS(LOADING_SELECTOR, data)
          const frames = extractFrameUrls(css)
          const firstFrame = frames[0]
          if (!firstFrame) return
          const styleEl = injectStyle(buildStaticCSS(LOADING_SELECTOR, firstFrame))
          loadingEntry = { selector: LOADING_SELECTOR, frames, styleEl, frameIndex: 0 }
          document.documentElement.classList.add('is-loading')
        })
        .catch(() => {})
    } else {
      document.documentElement.classList.remove('is-loading')
      if (loadingEntry) {
        loadingEntry.styleEl.remove()
        loadingEntry = null
      }
    }
  }

  function destroy() {
    if (animTimer) {
      clearInterval(animTimer)
      animTimer = null
    }
    for (const entry of entries) {
      entry.styleEl.remove()
    }
    entries.length = 0
    if (loadingEntry) {
      loadingEntry.styleEl.remove()
      loadingEntry = null
    }
    document.documentElement.classList.remove('is-loading')
  }

  return { initCursors, setLoadingCursor, destroy }
}
