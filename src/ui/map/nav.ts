/**
 * Keyboard movement between markers (R11.5): the arrows go to the nearest marker in that
 * direction on screen, Home and End to the first and last in reading order (west to east,
 * then north to south). Pure, over screen positions.
 */

export interface ScreenPoint {
  /** Horizontal coordinate or accessor. */
  x: number
  /** Vertical coordinate or accessor. */
  y: number
}

export type NavKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Home" | "End"

export const isNavKey = (key: string): key is NavKey => ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(key)

/** Indices in reading order: left to right, ties top to bottom. */
export function readingOrder(points: readonly ScreenPoint[]): number[] {
  return points.map((_, i) => i).toSorted((a, b) => points[a]!.x - points[b]!.x || points[a]!.y - points[b]!.y)
}

/**
 * The next marker from `index` for a key, or null when there is none that way. A candidate
 * must lie within 60° of the direction; the score favours distance along the direction and
 * penalises drift across it, so → from a marker picks the one most nearly to its right.
 */
export function nextMarker(points: readonly ScreenPoint[], index: number, key: NavKey): number | null {
  if (!points.length) return null
  const order = readingOrder(points)
  if (key === "Home") return order[0] ?? null
  if (key === "End") return order.at(-1) ?? null
  const from = points[index]
  if (!from) return order[0] ?? null
  const DIRECTIONS: Record<Exclude<NavKey, "Home" | "End">, readonly [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }
  const [ux, uy] = DIRECTIONS[key]
  let best: number | null = null
  let bestScore = Infinity
  points.forEach((point, candidate) => {
    if (candidate === index) return
    const dx = point.x - from.x
    const dy = point.y - from.y
    const along = dx * ux + dy * uy
    const across = Math.abs(dx * uy - dy * ux)
    if (along <= 0 || across > along * Math.tan(Math.PI / 3)) return
    const score = along + across * 2
    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  })
  return best
}
