/**
 * Largest-Triangle-Three-Buckets (Steinarsson 2013). Reduces a long series to `threshold`
 * points that keep its visual shape — peaks and troughs survive — for rendering only. The
 * readout and the table always use the full data.
 *
 * Returns the indices of the points to keep (ascending), so the caller can map them back to
 * any parallel arrays. Null values are skipped; gaps are preserved by the caller.
 */
export function lttbIndices(xs: readonly number[], ys: readonly (number | null)[], threshold: number): number[] {
  const n = xs.length
  if (threshold >= n || threshold < 3) return Array.from({ length: n }, (_, index) => index)
  const kept: number[] = [0]
  const every = (n - 2) / (threshold - 2)
  let a = 0
  for (let bucket = 0; bucket < threshold - 2; bucket++) {
    // The average of the next bucket is the third corner of the triangle.
    const nextStart = Math.floor((bucket + 1) * every) + 1
    const nextEnd = Math.min(n, Math.floor((bucket + 2) * every) + 1)
    let avgX = 0
    let avgY = 0
    let count = 0
    for (let index = nextStart; index < nextEnd; index++) {
      const y = ys[index]
      if (y === null || y === undefined) continue
      avgX += xs[index]!
      avgY += y
      count++
    }
    if (count > 0) {
      avgX /= count
      avgY /= count
    } else {
      avgX = xs[Math.min(n - 1, nextStart)]!
      avgY = ys[a] ?? 0
    }

    const start = Math.floor(bucket * every) + 1
    const end = Math.floor((bucket + 1) * every) + 1
    const ax = xs[a]!
    const ay = ys[a] ?? avgY
    let best = -1
    let bestIndex = start
    for (let index = start; index < end; index++) {
      const y = ys[index]
      if (y === null || y === undefined) continue
      const area = Math.abs((ax - avgX) * (y - ay) - (ax - xs[index]!) * (avgY - ay))
      if (area > best) {
        best = area
        bestIndex = index
      }
    }
    kept.push(bestIndex)
    a = bestIndex
  }
  kept.push(n - 1)
  return kept
}

/** Above this many points a series is decimated for drawing. */
export const DECIMATE_ABOVE = 2000
