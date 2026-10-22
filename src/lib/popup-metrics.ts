import { useSyncExternalStore } from "react"

/**
 * Popup geometry in CSS pixels, resolved from the design tokens at the current appearance.
 *
 * Base UI positioners take numbers, so the token values are measured rather than written
 * down. Every value follows `--ui-scale` (the root font size), density and line weight.
 */
export interface PopupMetrics {
  /** Gap between a trigger and its popup: `--popup-offset`. */
  offset: number
  /**
   * Gap for a popup opened at the pointer, such as a context menu: half of `--popup-offset`,
   * so the pointer rests just outside the first row instead of on its edge.
   */
  pointerOffset: number
  /**
   * Block offset that lines a submenu's first row up with the row that opened it:
   * `--inset-overlay + --border-width`. Pass it negated as the submenu's `alignOffset`.
   */
  submenuInset: number
  /** Distance a popup keeps from the viewport edge: `--popup-collision`. */
  collisionPadding: number
  /** One root `rem` in px, for component-local lengths such as an arrow's height. */
  rem: number
}

/** The values at `--ui-scale: 1` with a 1px border, used on the server and before styles load. */
export const POPUP_METRICS_FALLBACK: Readonly<PopupMetrics> = Object.freeze({
  offset: 6,
  pointerOffset: 3,
  submenuInset: 7,
  collisionPadding: 8,
  rem: 16,
})

let cache: PopupMetrics | null = null
let observer: MutationObserver | null = null
let pending = false
const listeners = new Set<() => void>()

/** Read a token-valued length by letting the browser resolve it on a hidden probe. */
function measure(): PopupMetrics | null {
  if (typeof document === "undefined" || !document.body) return null
  const root = document.documentElement
  // Tokens not loaded yet (no stylesheet): measuring would read zeros.
  if (!getComputedStyle(root).getPropertyValue("--popup-offset").trim()) return null
  const probe = document.createElement("div")
  probe.setAttribute("aria-hidden", "true")
  const style = probe.style
  style.position = "absolute"
  style.visibility = "hidden"
  style.pointerEvents = "none"
  style.inset = "0 auto auto 0"
  style.borderStyle = "none"
  style.paddingTop = "var(--popup-offset)"
  style.paddingRight = "calc(var(--inset-overlay) + var(--border-width))"
  style.paddingBottom = "var(--popup-collision, var(--space-2))"
  style.paddingLeft = "1rem" // tokens:allow the probe measures one root rem
  document.body.appendChild(probe)
  try {
    const computed = getComputedStyle(probe)
    const read = (value: string, fallback: number) => {
      const px = Number.parseFloat(value)
      return Number.isFinite(px) ? px : fallback
    }
    const offset = read(computed.paddingTop, POPUP_METRICS_FALLBACK.offset)
    return {
      offset,
      pointerOffset: offset / 2,
      submenuInset: read(computed.paddingRight, POPUP_METRICS_FALLBACK.submenuInset),
      collisionPadding: read(computed.paddingBottom, POPUP_METRICS_FALLBACK.collisionPadding),
      rem: read(computed.paddingLeft, POPUP_METRICS_FALLBACK.rem),
    }
  } finally {
    probe.remove()
  }
}

function same(a: PopupMetrics, b: PopupMetrics) {
  return (
    a.offset === b.offset &&
    a.pointerOffset === b.pointerOffset &&
    a.submenuInset === b.submenuInset &&
    a.collisionPadding === b.collisionPadding &&
    a.rem === b.rem
  )
}

/** Re-measure after an appearance change; notify only when a value moved. */
function refresh() {
  pending = false
  const next = measure()
  if (!next) return
  if (cache && same(cache, next)) return
  cache = next
  for (const listener of listeners) listener()
}

function schedule() {
  if (pending) return
  pending = true
  queueMicrotask(refresh)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!observer && typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
    // Scale, density and line weight are written as attributes or inline custom properties
    // on <html>; one observer serves every mounted popup.
    observer = new MutationObserver(schedule)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-density"] })
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && observer) {
      observer.disconnect()
      observer = null
      // Unobserved changes may follow; measure afresh on the next read.
      cache = null
    }
  }
}

/**
 * Current popup metrics, measured once and cached module-wide.
 * Returns {@link POPUP_METRICS_FALLBACK} when there is no document or the tokens are not loaded.
 */
export function readPopupMetrics(): Readonly<PopupMetrics> {
  if (!cache) cache = measure()
  return cache ?? POPUP_METRICS_FALLBACK
}

const serverSnapshot = () => POPUP_METRICS_FALLBACK

/**
 * Popup offsets and collision padding in px that follow the design tokens.
 *
 * Pass the values to Base UI positioners (`sideOffset`, `alignOffset`, `collisionPadding`).
 * The hook re-renders when `<html>` attributes change, which is how `--ui-scale`, density
 * and border width are applied, so popups keep their token spacing at every scale.
 *
 * @example
 * ```tsx
 * const popup = usePopupMetrics()
 * <Popover.Positioner sideOffset={popup.offset} collisionPadding={popup.collisionPadding} />
 * ```
 */
export function usePopupMetrics(): Readonly<PopupMetrics> {
  return useSyncExternalStore(subscribe, readPopupMetrics, serverSnapshot)
}

/** Test hook: forget the cached measurement and stop observing. */
export function resetPopupMetricsForTests() {
  cache = null
  pending = false
  observer?.disconnect()
  observer = null
  listeners.clear()
}
