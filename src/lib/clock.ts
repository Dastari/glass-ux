import { useSyncExternalStore } from "react"

/**
 * "Now" for relative times ("2 min ago", R2.7), as one external store for the whole page:
 * a single interval, running only while something subscribes, ticking every 15 seconds,
 * so render stays pure and every relative time on the page moves together.
 */
const TICK_MS = 15_000
const listeners = new Set<() => void>()
let now = 0
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

const snapshot = () => now || (now = Date.now())
const serverSnapshot = () => 0

/** The shared clock's current time in ms (0 while server rendering). */
export function useClock(): number {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
