import { useSyncExternalStore } from "react"

/**
 * A shared clock for relative times ("2 min ago"). One interval for the whole page,
 * running only while something subscribes, ticking every 15 seconds.
 */
const TICK_MS = 15_000
const listeners = new Set<() => void>()
let now = typeof window === "undefined" ? 0 : Date.now()
let timer: ReturnType<typeof setInterval> | undefined

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    now = Date.now()
    timer = setInterval(() => {
      now = Date.now()
      for (const notify of listeners) notify()
    }, TICK_MS)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

const getSnapshot = () => now
const getServerSnapshot = () => 0

export function useNow() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
