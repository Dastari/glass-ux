import { useSyncExternalStore } from "react"
import { flushSync } from "react-dom"

/**
 * Whether the page is being printed (between `beforeprint` and `afterprint`, or while print
 * media matches). Components that render only part of their content on screen, such as a
 * virtualised table, render all of it while this is true. The change is rendered
 * synchronously, before the browser lays the page out for print.
 */
export function usePrinting(): boolean {
  return useSyncExternalStore(subscribe, () => printing, () => false)
}

let printing = false
const listeners = new Set<() => void>()
let detach: (() => void) | null = null

function set(next: boolean) {
  if (next === printing) return
  printing = next
  flushSync(() => {
    for (const listener of listeners) listener()
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!detach && typeof window !== "undefined") {
    const before = () => set(true)
    const after = () => set(false)
    const media = window.matchMedia?.("print")
    const change = (event: MediaQueryListEvent) => set(event.matches)
    window.addEventListener("beforeprint", before)
    window.addEventListener("afterprint", after)
    media?.addEventListener?.("change", change)
    detach = () => {
      window.removeEventListener("beforeprint", before)
      window.removeEventListener("afterprint", after)
      media?.removeEventListener?.("change", change)
    }
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      detach?.()
      detach = null
    }
  }
}
