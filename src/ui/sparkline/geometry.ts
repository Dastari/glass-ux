/**
 * Sparkline geometry. Pure functions so they can be unit-tested and reused by any chart.
 *
 * The plot space is `x ∈ [0, n − 1]`, `y ∈ [0, 100]` with y growing downwards (SVG). The
 * SVG stretches that space to its box with preserveAspectRatio="none"; strokes use
 * non-scaling-stroke so the line stays 2px at any size.
 */

export interface Point {
  /** Horizontal coordinate or accessor. */
  x: number
  /** Vertical coordinate or accessor. */
  y: number
}

export type Domain = readonly [min: number, max: number]

/** The value range to plot: the given domain, or the data's own range with a little air. */
export function resolveDomain(data: readonly number[], domain?: Domain): Domain {
  if (domain) return domain
  if (data.length === 0) return [0, 1]
  let min = Infinity
  let max = -Infinity
  for (const value of data) {
    if (value < min) min = value
    if (value > max) max = value
  }
  if (min === max) return [min - 1, max + 1]
  const air = (max - min) * 0.08
  return [min - air, max + air]
}

/** Data → plot points. Values outside the domain are clamped to its edges. */
export function toPoints(data: readonly number[], domain: Domain): Point[] {
  const [min, max] = domain
  const span = max - min || 1
  return data.map((value, index) => ({
    x: index,
    y: 100 - (Math.min(max, Math.max(min, value)) - min) / span * 100,
  }))
}

const round = (value: number) => Math.round(value * 1000) / 1000

/**
 * A smooth path through the points using monotone cubic interpolation (Fritsch–Carlson):
 * it never overshoots, so a peak in the line is a peak in the data.
 */
export function monotonePath(points: readonly Point[]): string {
  const n = points.length
  if (n === 0) return ""
  const first = points[0]!
  if (n === 1) return `M${round(first.x)},${round(first.y)}`
  if (n === 2) {
    const last = points[1]!
    return `M${round(first.x)},${round(first.y)}L${round(last.x)},${round(last.y)}`
  }

  const dx: number[] = []
  const slope: number[] = []
  for (let index = 0; index < n - 1; index++) {
    const a = points[index]!
    const b = points[index + 1]!
    const run = b.x - a.x || 1
    dx.push(run)
    slope.push((b.y - a.y) / run)
  }

  const tangent: number[] = [slope[0]!]
  for (let index = 1; index < n - 1; index++) {
    const before = slope[index - 1]!
    const after = slope[index]!
    if (before * after <= 0) {
      tangent.push(0)
    } else {
      const w1 = 2 * dx[index]! + dx[index - 1]!
      const w2 = dx[index]! + 2 * dx[index - 1]!
      tangent.push((w1 + w2) / (w1 / before + w2 / after))
    }
  }
  tangent.push(slope[n - 2]!)

  let path = `M${round(first.x)},${round(first.y)}`
  for (let index = 0; index < n - 1; index++) {
    const a = points[index]!
    const b = points[index + 1]!
    const third = dx[index]! / 3
    path +=
      `C${round(a.x + third)},${round(a.y + tangent[index]! * third)}` +
      ` ${round(b.x - third)},${round(b.y - tangent[index + 1]! * third)}` +
      ` ${round(b.x)},${round(b.y)}`
  }
  return path
}

/** Close a line path down to the baseline for the area wash. */
export function areaPath(line: string, points: readonly Point[]): string {
  if (points.length < 2) return ""
  const first = points[0]!
  const last = points[points.length - 1]!
  return `${line}L${round(last.x)},100L${round(first.x)},100Z`
}

export interface SeriesStats {
  /** Lower allowed value. */
  min: number
  /** Upper value or visible-item limit, as specified by the type. */
  max: number
  avg: number
  last: number
}

export function seriesStats(data: readonly number[]): SeriesStats | null {
  if (data.length === 0) return null
  let min = Infinity
  let max = -Infinity
  let sum = 0
  for (const value of data) {
    min = Math.min(min, value)
    max = Math.max(max, value)
    sum += value
  }
  return { min, max, avg: sum / data.length, last: data[data.length - 1]! }
}

/** Nearest data index for a horizontal fraction (0–1) across the plot. */
export function indexAt(fraction: number, count: number): number {
  if (count <= 1) return 0
  return Math.min(count - 1, Math.max(0, Math.round(fraction * (count - 1))))
}
