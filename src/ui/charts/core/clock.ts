/**
 * "Now" for relative times (R2.7), as an external store that ticks every 30 seconds while
 * anything reads it — so render stays pure and "2 min ago" stays true.
 */
import { useSyncExternalStore } from "react"

const TICK = 30_000
let now = 0
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    now = Date.now()
    timer = setInterval(() => {
      now = Date.now()
      for (const notify of listeners) notify()
    }, TICK)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

const snapshot = () => (now || (now = Date.now()))
const serverSnapshot = () => 0

/** The current time (ms), or `fixed` when the caller supplies one (tests, fixtures). */
export function useNow(fixed?: Date): Date {
  const live = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  return fixed ?? new Date(live)
}
