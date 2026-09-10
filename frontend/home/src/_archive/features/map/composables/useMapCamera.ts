import { ref, readonly, type Ref } from 'vue'
import { MAP_VIEWBOX } from '../data/mapLocations'
import type { MapLocationPosition } from '../map-types'

const DURATION_FOCUS = 900
const DURATION_RESET = 700
const SCALE_FOCUS = 1.65

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useMapCamera(worldRef: Ref<SVGGElement | null>) {
  const scale = ref(1)
  const translate = ref({ x: 0, y: 0 })

  let rafId: number | null = null
  let animationStartTime = 0
  let from = { x: 0, y: 0, s: 1 }
  let to = { x: 0, y: 0, s: 1 }
  let resolveFn: (() => void) | null = null

  function applyTransform() {
    const el = worldRef.value
    if (!el) return
    el.style.transform = `translate(${translate.value.x}px, ${translate.value.y}px) scale(${scale.value})`
  }

  function tick(now: number) {
    if (!animationStartTime) animationStartTime = now
    const elapsed = now - animationStartTime
    const duration = resolveFn ? DURATION_FOCUS : DURATION_RESET
    const progress = Math.min(1, elapsed / duration)
    const eased = easeInOutCubic(progress)

    scale.value = from.s + (to.s - from.s) * eased
    translate.value = {
      x: from.x + (to.x - from.x) * eased,
      y: from.y + (to.y - from.y) * eased
    }
    applyTransform()

    if (progress < 1) {
      rafId = requestAnimationFrame(tick)
    } else {
      rafId = null
      animationStartTime = 0
      resolveFn?.()
      resolveFn = null
    }
  }

  function cancelCurrent() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
      animationStartTime = 0
      resolveFn = null
    }
  }

  function animate(target: { x: number; y: number; s: number }): Promise<void> {
    cancelCurrent()

    if (prefersReducedMotion()) {
      scale.value = target.s
      translate.value = { x: target.x, y: target.y }
      applyTransform()
      return Promise.resolve()
    }

    from = { x: translate.value.x, y: translate.value.y, s: scale.value }
    to = target

    return new Promise((resolve) => {
      resolveFn = resolve
      rafId = requestAnimationFrame(tick)
    })
  }

  function focus(position: MapLocationPosition): Promise<void> {
    const vw = MAP_VIEWBOX.width
    const vh = MAP_VIEWBOX.height
    const s = SCALE_FOCUS

    // 目标：将 location 移到 viewBox 中心
    const tx = vw / 2 - position.x * s
    const ty = vh / 2 - position.y * s

    return animate({ x: tx, y: ty, s })
  }

  function reset(): Promise<void> {
    return animate({ x: 0, y: 0, s: 1 })
  }

  function entrance(): Promise<void> {
    cancelCurrent()
    if (prefersReducedMotion()) {
      applyTransform()
      return Promise.resolve()
    }
    from = { x: 0, y: 0, s: 0.92 }
    to = { x: 0, y: 0, s: 1 }
    return new Promise((resolve) => {
      resolveFn = resolve
      rafId = requestAnimationFrame(tick)
    })
  }

  function destroy() {
    cancelCurrent()
  }

  return {
    scale: readonly(scale),
    translate: readonly(translate),
    focus,
    reset,
    entrance,
    destroy
  }
}
