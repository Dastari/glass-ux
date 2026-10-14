/**
 * Web Mercator in unit space ([0, 1] across the world, y down), for drawing outlines and
 * points without MapLibre: the loading silhouette and the gallery's static previews.
 *
 * The silhouette has to sit exactly where the map will draw the coastline. MapLibre's
 * fitBounds with padding centres the projected box and scales it to fit the padded
 * viewport, which is what an SVG with that box as its viewBox and `xMidYMid meet` does. So
 * the silhouette is an SVG inset by the fit padding, viewBox = the projected box: no
 * measuring, right on the server's first paint.
 */

/** [west, south, east, north] in degrees. */
export type LngLatBox = readonly [west: number, south: number, east: number, north: number]

/** Mercator stops at ±85.0511°, where the world is square. */
export const MAX_LATITUDE = 85.051129

export function projectX(lng: number): number {
  return (lng + 180) / 360
}

export function projectY(lat: number): number {
  const clamped = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat))
  const sin = Math.sin((clamped * Math.PI) / 180)
  return 0.5 - (0.25 * Math.log((1 + sin) / (1 - sin))) / Math.PI
}

export function unprojectY(y: number): number {
  const n = Math.PI - 2 * Math.PI * y
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

/** A box in unit space: x, y (top-left), width, height. */
export interface UnitBox {
  /** Horizontal coordinate or accessor. */
  x: number
  /** Vertical coordinate or accessor. */
  y: number
  w: number
  h: number
}

export function projectBox([west, south, east, north]: LngLatBox): UnitBox {
  const x = projectX(west)
  const y = projectY(north)
  return { x, y, w: Math.max(projectX(east) - x, 1e-9), h: Math.max(projectY(south) - y, 1e-9) }
}

/** The SVG viewBox for a box, in a scaled unit space so path numbers stay readable. */
export const SVG_SCALE = 10000

export function viewBoxOf(box: LngLatBox): string {
  const { x, y, w, h } = projectBox(box)
  const f = (value: number) => Number((value * SVG_SCALE).toFixed(4))
  return `${f(x)} ${f(y)} ${f(w)} ${f(h)}`
}

type Position = readonly number[]
type Ring = readonly Position[]

/** Perpendicular distance² from p to segment ab (unit space). */
function segmentDistance2(p: readonly [number, number], a: readonly [number, number], b: readonly [number, number]) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const length = dx * dx + dy * dy
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length))
  const x = a[0] + t * dx - p[0]
  const y = a[1] + t * dy - p[1]
  return x * x + y * y
}

/** Douglas–Peucker on projected points. */
function simplify(points: Array<readonly [number, number]>, tolerance: number) {
  if (points.length < 5 || tolerance <= 0) return points
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack: Array<[number, number]> = [[0, points.length - 1]]
  const t2 = tolerance * tolerance
  while (stack.length) {
    const [a, b] = stack.pop()!
    let max = -1
    let at = -1
    for (let i = a + 1; i < b; i++) {
      const d = segmentDistance2(points[i]!, points[a]!, points[b]!)
      if (d > max) {
        max = d
        at = i
      }
    }
    if (max > t2) {
      keep[at] = 1
      stack.push([a, at], [at, b])
    }
  }
  return points.filter((_, i) => keep[i])
}

/**
 * An SVG path for polygon rings in the SVG_SCALE unit space. `tolerance` (unit space) drops
 * detail finer than a pixel at the silhouette's size; rings smaller than it vanish.
 */
export function ringsToPath(rings: readonly Ring[], tolerance = 0): string {
  let path = ""
  for (const ring of rings) {
    const projected = ring.map((position) => [projectX(position[0] ?? 0), projectY(position[1] ?? 0)] as const)
    const points = simplify(projected, tolerance)
    if (points.length < 4) continue
    path += points.map(([x, y], i) => `${i ? "L" : "M"}${(x * SVG_SCALE).toFixed(2)} ${(y * SVG_SCALE).toFixed(2)}`).join("") + "Z"
  }
  return path
}

/** Every outer and inner ring of a Polygon or MultiPolygon geometry. */
export function ringsOf(geometry: { type: string; coordinates: unknown }): Ring[] {
  if (geometry.type === "Polygon") return geometry.coordinates as Ring[]
  if (geometry.type === "MultiPolygon") return (geometry.coordinates as Ring[][]).flat()
  return []
}

/** The box around a set of points, padded so a single point still has an area. */
export function boxOfPoints(points: ReadonlyArray<{ lng: number; lat: number }>, minSpan = 0.02): LngLatBox | null {
  if (!points.length) return null
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity
  for (const { lng, lat } of points) {
    west = Math.min(west, lng)
    east = Math.max(east, lng)
    south = Math.min(south, lat)
    north = Math.max(north, lat)
  }
  const padLng = Math.max(0, (minSpan - (east - west)) / 2)
  const padLat = Math.max(0, (minSpan - (north - south)) / 2)
  return [west - padLng, south - padLat, east + padLng, north + padLat]
}

/** Whether a point lies inside a box (a box may cross the antimeridian: west > east). */
export function boxContains([west, south, east, north]: LngLatBox, lng: number, lat: number): boolean {
  if (lat < south || lat > north) return false
  return west <= east ? lng >= west && lng <= east : lng >= west || lng <= east
}
