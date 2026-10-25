/**
 * The x window of a zoomable chart: which part of the x range the plot shows. Pure maths
 * (zoomWindow, panWindow, clampWindow) and the controlled/uncontrolled state hook.
 *
 * A window is two numbers (milliseconds for time). It never gets narrower than two sample
 * intervals, never wider than the data, and never leaves it. The full range is "not zoomed":
 * the hook reports it as null, so a controlled caller can tell "everything" from a window
 * that happens to cover everything today.
 */
import { useCallback, useMemo, useRef, useState } from "react"
import { toNumber, type XValue } from "./scales.js"

/** A visible x range, in x units (milliseconds for time). */
export type XWindow = readonly [from: number, to: number]

/** A visible x range in the chart's own x type: Dates for a time series, numbers otherwise. */
export type XDomain = readonly [from: XValue, to: XValue]

/** The narrowest window: two sample intervals, so a zoomed plot still shows a line. */
export function minSpan(xs: readonly number[]): number {
  if (xs.length < 2) return 1
  const span = xs[xs.length - 1]! - xs[0]!
  return Math.min(span, (span / (xs.length - 1)) * 2) || 1
}

/** Keep a window inside `full`, between `min` wide and the whole range. */
export function clampWindow(window: XWindow, full: XWindow, min: number): XWindow {
  const fullSpan = full[1] - full[0]
  let [from, to] = window[0] <= window[1] ? window : [window[1], window[0]]
  let span = to - from
  if (span < min) {
    const centre = (from + to) / 2
    span = Math.min(min, fullSpan)
    from = centre - span / 2
    to = centre + span / 2
  }
  if (span >= fullSpan) return full
  if (from < full[0]) {
    to += full[0] - from
    from = full[0]
  }
  if (to > full[1]) {
    from -= to - full[1]
    to = full[1]
  }
  return [from, to]
}

/**
 * Zoom by `factor` (below 1 zooms in, above 1 out) around `at`, an x value that keeps its
 * place in the plot, then clamp.
 */
export function zoomWindow(window: XWindow, factor: number, at: number, full: XWindow, min: number): XWindow {
  const span = window[1] - window[0]
  const t = span > 0 ? Math.min(1, Math.max(0, (at - window[0]) / span)) : 0.5
  const next = span * factor
  const from = at - t * next
  return clampWindow([from, from + next], full, min)
}

/** Move the window by `delta` x units, stopping at the ends. */
export function panWindow(window: XWindow, delta: number, full: XWindow, min: number): XWindow {
  return clampWindow([window[0] + delta, window[1] + delta], full, min)
}

/** Whether a window covers the whole range (to within a pixel's worth of rounding). */
export function isFullWindow(window: XWindow, full: XWindow): boolean {
  const tolerance = (full[1] - full[0]) * 1e-6
  return window[0] <= full[0] + tolerance && window[1] >= full[1] - tolerance
}

/** The window that shows index `index`, moving `window` as little as possible. */
export function revealIndex(window: XWindow, xs: readonly number[], index: number, full: XWindow, min: number): XWindow {
  const at = xs[index]
  if (at === undefined || (at >= window[0] && at <= window[1])) return window
  const delta = at < window[0] ? at - window[0] : at - window[1]
  return panWindow(window, delta, full, min)
}

/**
 * The index range to draw for a window: the samples inside it plus one either side, so the
 * line runs to the plot's edges.
 */
export function windowIndices(xs: readonly number[], window: XWindow): [number, number] {
  if (!xs.length) return [0, -1]
  let first = 0
  while (first < xs.length - 1 && xs[first + 1]! <= window[0]) first++
  let last = xs.length - 1
  while (last > 0 && xs[last - 1]! >= window[1]) last--
  return [first, last]
}

/** The samples inside a window (the first and last index whose x lies within it). */
export function insideIndices(xs: readonly number[], window: XWindow): [number, number] {
  let first = 0
  while (first < xs.length - 1 && xs[first]! < window[0]) first++
  let last = xs.length - 1
  while (last > 0 && xs[last]! > window[1]) last--
  return [first, Math.max(first, last)]
}

export interface XWindowOptions {
  /** The chart's x values, as numbers, ascending. */
  xs: readonly number[]
  /** Whether x is time: the window is reported as Dates. */
  time: boolean
  /** Controlled window; null shows everything. Leave undefined for uncontrolled. */
  value?: XDomain | null
  /** The uncontrolled starting window. */
  defaultValue?: XDomain | null
  /** Called with the new window, or null when it returns to the whole range. */
  onChange?: (domain: XDomain | null) => void
}

export interface XWindowState {
  /** The window shown: the whole range when not zoomed. */
  window: XWindow
  /** The whole range. */
  full: XWindow
  /** The narrowest window allowed. */
  min: number
  /** Whether the window is narrower than the whole range. */
  zoomed: boolean
  /** Set the window (clamped); null or the whole range resets it. */
  commit: (next: XWindow | null) => void
}

/**
 * The visible x window, controlled (`value`) or not (`defaultValue`). Uncontrolled, a window
 * that ends at the latest sample follows a live series as new samples arrive.
 */
export function useXWindow({ xs, time, value, defaultValue, onChange }: XWindowOptions): XWindowState {
  const first = xs[0] ?? 0
  const last = xs[xs.length - 1] ?? 1
  const full = useMemo<XWindow>(() => [first, last === first ? first + 1 : last], [first, last])
  const min = useMemo(() => minSpan(xs), [xs])
  const controlled = value !== undefined
  const toWindow = (domain: XDomain | null | undefined): XWindow | null => (domain ? [toNumber(domain[0]), toNumber(domain[1])] : null)
  const [own, setOwn] = useState<XWindow | null>(() => toWindow(defaultValue))
  // A live series: a window pinned to the latest sample moves on with it.
  const lastSeen = useRef(last)
  let current = controlled ? toWindow(value) : own
  if (!controlled && own && lastSeen.current !== last) {
    if (Math.abs(own[1] - lastSeen.current) < 1e-9) {
      const moved: XWindow = [own[0] + (last - lastSeen.current), last]
      current = moved
      setOwn(moved)
    }
    lastSeen.current = last
  } else lastSeen.current = last
  const from = current?.[0]
  const to = current?.[1]
  const window = useMemo<XWindow>(() => (from !== undefined && to !== undefined ? clampWindow([from, to], full, min) : full), [from, to, full, min])
  const zoomed = !isFullWindow(window, full)

  const commit = useCallback(
    (next: XWindow | null) => {
      const clamped = next ? clampWindow(next, full, min) : null
      const reset = !clamped || isFullWindow(clamped, full)
      if (!controlled) setOwn(reset ? null : clamped)
      onChange?.(reset ? null : time ? [new Date(clamped[0]), new Date(clamped[1])] : [clamped[0], clamped[1]])
    },
    [full, min, controlled, onChange, time]
  )
  return { window, full, min, zoomed, commit }
}
