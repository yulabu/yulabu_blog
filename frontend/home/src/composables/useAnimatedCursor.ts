import { convertAniBinaryToCSS } from 'ani-cursor'

const CURSOR_MAP: Record<string, string> = {
  '*': '/cursor/arrow.ani',
  'a, button, [role="link"]': '/cursor/link.ani',
  'input, textarea, [contenteditable]': '/cursor/beam.ani',
  '[disabled], .disabled': '/cursor/no.ani',
}

const LOADING_SELECTOR = '.is-loading, .is-loading *'
const LOADING_CURSOR = '/cursor/busy.ani'

let styleEl: HTMLStyleElement | null = null
let loadingStyleEl: HTMLStyleElement | null = null

async function fetchAni(url: string): Promise<Uint8Array> {
  const resp = await fetch(url)
  const buf = await resp.arrayBuffer()
  return new Uint8Array(buf)
}

function injectCSS(css: string): HTMLStyleElement {
  const el = document.createElement('style')
  el.textContent = css
  document.head.appendChild(el)
  return el
}

export function useAnimatedCursor() {
  async function initCursors() {
    const tasks = Object.entries(CURSOR_MAP).map(async ([selector, aniUrl]) => {
      try {
        const data = await fetchAni(aniUrl)
        return convertAniBinaryToCSS(selector, data)
      } catch (e) {
        console.warn(`[cursor] 加载失败: ${aniUrl}`, e)
        return ''
      }
    })

    const cssList = await Promise.all(tasks)
    const css = cssList.filter(Boolean).join('\n')

    if (css && !styleEl) {
      styleEl = injectCSS(css)
    }
  }

  function setLoadingCursor(active: boolean) {
    if (active) {
      if (loadingStyleEl) return
      fetchAni(LOADING_CURSOR)
        .then((data) => {
          const css = convertAniBinaryToCSS(LOADING_SELECTOR, data)
          loadingStyleEl = injectCSS(css)
        })
        .catch(() => {})
      document.documentElement.classList.add('is-loading')
    } else {
      document.documentElement.classList.remove('is-loading')
      if (loadingStyleEl) {
        loadingStyleEl.remove()
        loadingStyleEl = null
      }
    }
  }

  return { initCursors, setLoadingCursor }
}
