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
const LOADING_OFF_DELAY = 300

const NO_SELECT_CSS = `
a, button, [role="link"], [role="button"], [draggable="true"], canvas {
  -webkit-user-select: none;
  user-select: none;
}`

const FRAME_URL_RE = /url\((data:image\/x-win-bitmap;base64,[^)]+)\)/g

interface BuiltCursor {
  css: string
  firstFrame: string
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
    if (match[1]) frames.push(match[1])
  }
  return frames
}

function extractKeyframesBlock(css: string): string | null {
  const start = css.indexOf('@keyframes')
  if (start === -1) return null
  const braceStart = css.indexOf('{', start)
  if (braceStart === -1) return null
  let depth = 1
  for (let i = braceStart + 1; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') {
      depth--
      if (depth === 0) return css.slice(start, i + 1)
    }
  }
  return null
}

function extractAnimName(css: string): string | null {
  const m = /@keyframes\s+([^{]+)\{/.exec(css)
  return m?.[1]?.trim() ?? null
}

function extractDurationMs(css: string): number | null {
  const m = /([0-9]+(?:\.[0-9]+)?)ms/.exec(css)
  const raw = m?.[1]
  return raw ? Math.round(parseFloat(raw) * 100) / 100 : null
}

function splitSelectors(selector: string): string[] {
  return selector
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function injectStyle(css: string): HTMLStyleElement {
  const el = document.createElement('style')
  el.textContent = css
  document.head.appendChild(el)
  return el
}

function buildCursorCSS(selector: string, data: Uint8Array): BuiltCursor {
  const generated = convertAniBinaryToCSS(selector, data)
  const frames = extractFrameUrls(generated)
  const firstFrame = frames[0] ?? ''
  if (!firstFrame) return { css: '', firstFrame: '' }

  const atoms = splitSelectors(selector)
  const staticRules = atoms.map((s) => `\n${s} { cursor: url(${firstFrame}), auto; }`).join('')

  return { css: staticRules, firstFrame }
}

export function useAnimatedCursor() {
  let initialized = false
  let styleEl: HTMLStyleElement | null = null
  let loadingStyleEl: HTMLStyleElement | null = null
  let pendingLoadingEl: HTMLStyleElement | null = null
  let loadingOffTimer: ReturnType<typeof setTimeout> | null = null
  let loadingToken = 0
  let loadingCss: string | null = null

  async function initCursors() {
    if (initialized) return
    initialized = true
    const tasks = Object.entries(CURSOR_MAP).map(async ([selector, aniUrl]) => {
      try {
        const data = await fetchAni(aniUrl)
        return buildCursorCSS(selector, data).css
      } catch (e) {
        console.warn(`[cursor] 加载失败: ${aniUrl}`, e)
        return ''
      }
    })

    const cssList = await Promise.all(tasks)
    const css = [NO_SELECT_CSS, ...cssList.filter(Boolean)].join('\n')
    if (css) styleEl = injectStyle(css)
  }

  async function loadBusyCss(): Promise<string | null> {
    if (loadingCss) return loadingCss
    try {
      const data = await fetchAni(LOADING_CURSOR)
      loadingCss = buildCursorCSS(LOADING_SELECTOR, data).css || null
    } catch (e) {
      console.warn(`[cursor] 加载失败: ${LOADING_CURSOR}`, e)
      loadingCss = null
    }
    return loadingCss
  }

  function setLoadingCursor(active: boolean) {
    if (active) {
      if (loadingOffTimer) {
        clearTimeout(loadingOffTimer)
        loadingOffTimer = null
      }
      if (pendingLoadingEl) {
        loadingStyleEl = pendingLoadingEl
        pendingLoadingEl = null
      }
      document.documentElement.classList.add('is-loading')
      if (loadingStyleEl) return
      const token = ++loadingToken
      loadBusyCss().then((css) => {
        if (!css || token !== loadingToken || loadingStyleEl) return
        loadingStyleEl = injectStyle(css)
      })
    } else {
      loadingToken++
      document.documentElement.classList.remove('is-loading')
      if (loadingOffTimer) {
        clearTimeout(loadingOffTimer)
        loadingOffTimer = null
      }
      const el = loadingStyleEl
      if (!el) return
      loadingStyleEl = null
      pendingLoadingEl = el
      loadingOffTimer = setTimeout(() => {
        el.remove()
        if (pendingLoadingEl === el) pendingLoadingEl = null
        loadingOffTimer = null
      }, LOADING_OFF_DELAY)
    }
  }

  function destroy() {
    initialized = false
    if (loadingOffTimer) {
      clearTimeout(loadingOffTimer)
      loadingOffTimer = null
    }
    if (styleEl) {
      styleEl.remove()
      styleEl = null
    }
    if (loadingStyleEl) {
      loadingStyleEl.remove()
      loadingStyleEl = null
    }
    if (pendingLoadingEl) {
      pendingLoadingEl.remove()
      pendingLoadingEl = null
    }
    loadingToken++
    document.documentElement.classList.remove('is-loading')
  }

  return { initCursors, setLoadingCursor, destroy }
}
