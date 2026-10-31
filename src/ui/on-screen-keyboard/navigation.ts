/** A key's box on screen, as from getBoundingClientRect. */
export interface KeyRect {
  left: number
  top: number
  right: number
  bottom: number
}

/** An arrow direction on screen. */
export type NavigationDirection = "up" | "down" | "left" | "right"

/** Options for {@link nextKeyIndex}. */
export interface NavigationOptions {
  /** At an edge, continue from the far side of the same row or column. Default false. */
  wrap?: boolean
  /**
   * The horizontal position to aim for when moving up or down, so a column survives a pass
   * over a wide key (from "v" up through the space bar lands back on "v"). Defaults to the
   * centre of the current key.
   */
  column?: number
}

const centreX = (rect: KeyRect) => (rect.left + rect.right) / 2
const centreY = (rect: KeyRect) => (rect.top + rect.bottom) / 2
// Distance from a point to a span: 0 inside it.
const toSpan = (point: number, start: number, end: number) => (point < start ? start - point : point > end ? point - end : 0)

/**
 * The key an arrow moves to, from the keys' boxes: the nearest key whose centre lies in the
 * pressed direction, preferring keys in the nearest row (or column) and, within it, the key
 * that covers the current position on the other axis. Works for keys of any width and for
 * any geometry the browser drew (RTL, physical layouts). Returns null at an edge when `wrap`
 * is off, so the caller can move focus out of the keyboard.
 */
export function nextKeyIndex(rects: readonly KeyRect[], from: number, direction: NavigationDirection, options: NavigationOptions = {}): number | null {
  const origin = rects[from]
  if (!origin) return rects.length ? 0 : null
  const vertical = direction === "up" || direction === "down"
  const sign = direction === "down" || direction === "right" ? 1 : -1
  const along = vertical ? (options.column ?? centreX(origin)) : centreY(origin)
  const primary = (rect: KeyRect) => (vertical ? centreY(rect) - centreY(origin) : centreX(rect) - centreX(origin)) * sign
  // Gap between the origin's leading edge and a candidate's near edge, in the direction of travel.
  const gap = (rect: KeyRect) =>
    vertical ? Math.max(0, sign > 0 ? rect.top - origin.bottom : origin.top - rect.bottom) : Math.max(0, sign > 0 ? rect.left - origin.right : origin.left - rect.right)
  const across = (rect: KeyRect) => (vertical ? toSpan(along, rect.left, rect.right) : toSpan(along, rect.top, rect.bottom))
  const size = vertical ? origin.bottom - origin.top : origin.right - origin.left
  const tolerance = Math.max(1, size / 4)

  const pick = (candidates: number[], distance: (rect: KeyRect) => number) => {
    if (!candidates.length) return null
    // The nearest band first (the next row up, the next key along), then the best aligned key in it.
    const nearest = Math.min(...candidates.map((index) => distance(rects[index] as KeyRect)))
    let best: number | null = null
    let bestScore = Number.POSITIVE_INFINITY
    for (const index of candidates) {
      const rect = rects[index] as KeyRect
      if (distance(rect) > nearest + tolerance) continue
      const score = across(rect) * 4 + Math.abs(primary(rect))
      if (score < bestScore) {
        bestScore = score
        best = index
      }
    }
    return best
  }

  const ahead: number[] = []
  for (let index = 0; index < rects.length; index++) {
    if (index === from) continue
    if (primary(rects[index] as KeyRect) > 1) ahead.push(index)
  }
  // Horizontal moves stay in the row: a key must overlap the origin's band.
  const inBand = vertical ? ahead : ahead.filter((index) => across(rects[index] as KeyRect) === 0)
  const next = pick(inBand, gap)
  if (next !== null || !options.wrap) return next

  // Wrap: the key furthest back on the same row (or column).
  const behind: number[] = []
  for (let index = 0; index < rects.length; index++) {
    if (index === from) continue
    const rect = rects[index] as KeyRect
    if (primary(rect) < -1 && (!vertical ? across(rect) === 0 : true)) behind.push(index)
  }
  return pick(behind, (rect) => -Math.abs(primary(rect)) + 1e6)
}

/**
 * The first or last key of the origin's row, by position on screen: `start` is the left end
 * in a left-to-right row and the right end in a right-to-left one (Home and End).
 */
export function rowEdgeIndex(rects: readonly KeyRect[], from: number, edge: "start" | "end", rtl = false): number {
  const origin = rects[from]
  if (!origin) return from
  const leftmost = (edge === "start") !== rtl
  let best = from
  for (let index = 0; index < rects.length; index++) {
    const rect = rects[index] as KeyRect
    if (toSpan(centreY(origin), rect.top, rect.bottom) !== 0) continue
    const current = rects[best] as KeyRect
    if (leftmost ? centreX(rect) < centreX(current) : centreX(rect) > centreX(current)) best = index
  }
  return best
}
