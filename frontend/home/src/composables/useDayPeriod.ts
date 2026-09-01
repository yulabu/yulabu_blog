export type DayPeriod = 'dawn' | 'day' | 'dusk' | 'night'

function getPeriodOf(date: Date): DayPeriod {
  const h = date.getHours()
  if (h >= 6 && h < 9) return 'dawn'
  if (h >= 9 && h < 17) return 'day'
  if (h >= 17 && h < 20) return 'dusk'
  return 'night'
}

function startOfNextPeriod(date: Date): Date {
  const h = date.getHours()
  const next = new Date(date)
  next.setMinutes(0, 0, 0)

  if (h < 6) {
    next.setHours(6)
  } else if (h < 9) {
    next.setHours(9)
  } else if (h < 17) {
    next.setHours(17)
  } else if (h < 20) {
    next.setHours(20)
  } else {
    next.setHours(6)
    next.setDate(next.getDate() + 1)
  }
  return next
}

export function useDayPeriod() {
  let timer: ReturnType<typeof setTimeout> | null = null
  let started = false

  function apply(date = new Date()) {
    const period = getPeriodOf(date)
    document.documentElement.setAttribute('data-period', period)
  }

  function schedule(base = new Date()) {
    if (timer) clearTimeout(timer)
    const next = startOfNextPeriod(base)
    const delay = next.getTime() - base.getTime() + 1000
    timer = setTimeout(() => {
      apply()
      schedule()
    }, Math.max(delay, 1000))
  }

  function handleVisibility() {
    if (document.hidden) return
    apply()
    schedule()
  }

  function start() {
    if (started) return
    started = true
    apply()
    schedule()
    document.addEventListener('visibilitychange', handleVisibility)
  }

  function stop() {
    if (!started) return
    started = false
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    document.removeEventListener('visibilitychange', handleVisibility)
    document.documentElement.removeAttribute('data-period')
  }

  return { start, stop }
}