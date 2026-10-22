import { useSyncExternalStore } from "react"

/**
 * One root `rem` in CSS px, read once and shared. Components that turn rem tokens into px
 * (tiers, column widths, breakpoints) call this instead of reading the root's computed
 * font size each time, which forces a style recalculation when anything is pending.
 *
 * The root size is `100% × --ui-scale` (set inline on <html> by the appearance), and a host
 * may change it with classes, attributes or viewport media queries, so the value is
 * dropped on any change to <html>'s attributes and on resize, and read again when next
 * needed. Other documents (pop-out windows) are read directly.
 */
const FALLBACK = 16
let cached: number | null = null
let watching = false
let pending = false
const listeners = new Set<() => void>()

const read = (root: Element) => Number.parseFloat(getComputedStyle(root).fontSize) || FALLBACK

function changed() {
  const before = cached
  cached = null
  if (!listeners.size || pending) return
  pending = true
  queueMicrotask(() => {
    pending = false
    if (remPx() !== before) for (const listener of listeners) listener()
  })
}

function watch() {
  if (watching || typeof MutationObserver === "undefined") return
  watching = true
  new MutationObserver(changed).observe(document.documentElement, { attributes: true })
  window.addEventListener("resize", changed, { passive: true })
}

/** One root rem in px for `doc` (default: this document); 16 without a DOM. */
export function remPx(doc: Document | undefined = typeof document === "undefined" ? undefined : document): number {
  if (!doc) return FALLBACK
  if (doc !== document) return read(doc.documentElement)
  if (cached === null) {
    cached = read(doc.documentElement)
    watch()
  }
  return cached
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** {@link remPx} as React state: re-renders when the root size changes. */
export function useRemPx(): number {
  return useSyncExternalStore(subscribe, remPx, () => FALLBACK)
}
