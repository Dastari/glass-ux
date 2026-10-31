/**
 * Clustering by status. Points carry a status; MapLibre's GeoJSON source clusters them
 * (`cluster: true`) and aggregates one count per status through `clusterProperties`, so a
 * cluster knows how many healthy, warning, danger and unknown points it holds without
 * fetching its leaves. The marker draws those counts as a segmented ring.
 */
import { listFormat, numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

/** Worst first: the order a ring draws its segments and the order "worst" is read in. */
export const MAP_STATUSES = ["danger", "warning", "healthy", "unknown"] as const
export type MapStatus = (typeof MAP_STATUSES)[number]

export type StatusCounts = Readonly<Record<MapStatus, number>>

/** The property a cluster carries for each status's count. */
export const countKey = (status: MapStatus) => `count_${status}`

/** The feature property a point's status is read from. */
export const STATUS_PROPERTY = "status"

/**
 * `clusterProperties` for a GeoJSON source: for each status, map a point to 1 or 0 and add
 * them up. Evaluated in MapLibre's worker as the cluster index is built.
 */
export function statusClusterProperties(): Record<string, [string, unknown]> {
  return Object.fromEntries(MAP_STATUSES.map((status) => [countKey(status), ["+", ["case", ["==", ["get", STATUS_PROPERTY], status], 1, 0]]]))
}

/** Status counts that are all zero. Shared; do not mutate. */
export const EMPTY_COUNTS: StatusCounts = { danger: 0, warning: 0, healthy: 0, unknown: 0 }

/** The counts from a cluster's properties (or a single point's status). */
export function countsOf(properties: Readonly<Record<string, unknown>> | null | undefined): StatusCounts {
  if (!properties) return EMPTY_COUNTS
  if (properties.cluster) {
    const read = (status: MapStatus) => {
      const value = Number(properties[countKey(status)])
      return Number.isFinite(value) ? value : 0
    }
    return { danger: read("danger"), warning: read("warning"), healthy: read("healthy"), unknown: read("unknown") }
  }
  const status = properties[STATUS_PROPERTY]
  return { ...EMPTY_COUNTS, ...(isStatus(status) ? { [status]: 1 } : { unknown: 1 }) }
}

export function isStatus(value: unknown): value is MapStatus {
  return typeof value === "string" && (MAP_STATUSES as readonly string[]).includes(value)
}

/** Add up counts (a list of points, several clusters). */
export function sumCounts(list: Iterable<StatusCounts>): StatusCounts {
  const total = { danger: 0, warning: 0, healthy: 0, unknown: 0 }
  for (const counts of list) for (const status of MAP_STATUSES) total[status] += counts[status]
  return total
}

/** Counts points by their `status`. */
export function countStatuses(points: Iterable<{ status: MapStatus }>): StatusCounts {
  const total = { danger: 0, warning: 0, healthy: 0, unknown: 0 }
  for (const point of points) total[point.status] += 1
  return total
}

/** The number of points across all statuses. */
export const totalOf = (counts: StatusCounts) => MAP_STATUSES.reduce((sum, status) => sum + counts[status], 0)

/**
 * The status a marker shows: the worst one present. Unknown (offline, no data) only wins
 * when nothing else is known; a cluster with one danger point is danger.
 */
export function worstOf(counts: StatusCounts): MapStatus {
  for (const status of ["danger", "warning", "healthy"] as const) if (counts[status] > 0) return status
  return "unknown"
}

export interface RingSegment {
  /** Current operation or connection status. */
  status: MapStatus
  /** Item count shown by the component. */
  count: number
  /** SVG path on a circle of radius `r` centred on 0,0; a lone segment is a full circle. */
  d: string
}

const point = (r: number, angle: number) => {
  const radians = ((angle - 90) * Math.PI) / 180
  return `${(r * Math.cos(radians)).toFixed(3)} ${(r * Math.sin(radians)).toFixed(3)}`
}

/**
 * Ring segments clockwise from 12 o'clock, worst first, separated by `gap` degrees. Every
 * present status keeps at least `minSweep` degrees so one danger point in a cluster of 200
 * still shows.
 */
export function ringSegments(counts: StatusCounts, r: number, gap = 10, minSweep = 18): RingSegment[] {
  const present = MAP_STATUSES.filter((status) => counts[status] > 0)
  const total = totalOf(counts)
  if (!present.length || total <= 0) return []
  if (present.length === 1) {
    const status = present[0]!
    return [{ status, count: counts[status], d: `M${point(r, 0)}A${r} ${r} 0 1 1 ${point(r, 180)}A${r} ${r} 0 1 1 ${point(r, 360)}` }]
  }
  const available = 360 - gap * present.length
  // Give small segments their minimum, then share the rest by count.
  const raw = present.map((status) => (counts[status] / total) * available)
  const small = raw.map((sweep) => sweep < minSweep)
  const reserved = small.reduce((sum, isSmall) => sum + (isSmall ? minSweep : 0), 0)
  const largeTotal = present.reduce((sum, status, i) => sum + (small[i] ? 0 : counts[status]), 0)
  let angle = gap / 2
  return present.map((status, i) => {
    const sweep = small[i] ? minSweep : ((counts[status] / largeTotal) * (available - reserved))
    const start = angle
    const end = angle + sweep
    angle = end + gap
    return { status, count: counts[status], d: `M${point(r, start)}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${point(r, end)}` }
  })
}

/** "3 warning, 1 danger, 12 healthy": the accessible summary of a cluster's ring, with counts written and joined as `locale` (default `getLocale()`) does ("1,200 healthy"). */
export function describeCounts(counts: StatusCounts, labels: Readonly<Record<MapStatus, string>>, locale = getLocale()): string {
  const number = numberFormat(locale)
  return listFormat(locale, { type: "unit", style: "short" }).format(
    MAP_STATUSES.filter((status) => counts[status] > 0).map((status) => `${number.format(counts[status])} ${labels[status]}`),
  )
}
