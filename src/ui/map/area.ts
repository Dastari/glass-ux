/**
 * Areas around points: a circle of N metres drawn as a polygon on the sphere, so it keeps its
 * true size at every zoom and latitude. Pure, and free of MapLibre, so React code and tests can
 * use it without the map chunk.
 */
import type * as GeoJSON from "geojson"

/** Mean Earth radius in metres (the spherical model web maps draw on). */
const EARTH = 6_371_008.8
const toRad = (degrees: number) => (degrees * Math.PI) / 180
const toDeg = (radians: number) => (radians * 180) / Math.PI

export interface LngLat {
  lng: number
  lat: number
}

/** The point `metres` from `from` along `bearing` (degrees clockwise from north). */
export function destination(from: LngLat, metres: number, bearing: number): LngLat {
  const angle = metres / EARTH
  const heading = toRad(bearing)
  const lat1 = toRad(from.lat)
  const lng1 = toRad(from.lng)
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angle) + Math.cos(lat1) * Math.sin(angle) * Math.cos(heading))
  const lng2 = lng1 + Math.atan2(Math.sin(heading) * Math.sin(angle) * Math.cos(lat1), Math.cos(angle) - Math.sin(lat1) * Math.sin(lat2))
  return { lat: toDeg(lat2), lng: ((toDeg(lng2) + 540) % 360) - 180 }
}

/** Great-circle distance in metres (haversine). */
export function distanceMetres(a: LngLat, b: LngLat): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Segments in a circle: smooth at any size the map draws, cheap for a few hundred sites. */
const SEGMENTS = 96

/** A circle of `metres` around `center` as a closed GeoJSON polygon. */
export function circlePolygon(center: LngLat, metres: number, properties: GeoJSON.GeoJsonProperties = {}): GeoJSON.Feature<GeoJSON.Polygon> {
  const ring: GeoJSON.Position[] = []
  for (let step = 0; step < SEGMENTS; step++) {
    const point = destination(center, metres, (step * 360) / SEGMENTS)
    ring.push([point.lng, point.lat])
  }
  ring.push(ring[0]!)
  return { type: "Feature", properties, geometry: { type: "Polygon", coordinates: [ring] } }
}

export const NO_AREAS: GeoJSON.FeatureCollection<GeoJSON.Polygon> = { type: "FeatureCollection", features: [] }

/** Circles for the points that carry a positive, finite radius. */
export function areasToGeoJSON(points: ReadonlyArray<LngLat & { id: string; radius?: number }>): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const features = points
    .filter((point) => typeof point.radius === "number" && Number.isFinite(point.radius) && point.radius > 0)
    .map((point) => circlePolygon(point, point.radius!, { id: point.id }))
  return features.length ? { type: "FeatureCollection", features } : NO_AREAS
}

/** The points, plus the north, south, east and west edges of each one's area (for framing). */
export function withAreaEdges<P extends LngLat & { radius?: number }>(points: readonly P[]): readonly LngLat[] {
  if (!points.some((point) => typeof point.radius === "number" && point.radius > 0)) return points
  return points.flatMap((point) =>
    typeof point.radius === "number" && Number.isFinite(point.radius) && point.radius > 0 ? [point, ...[0, 90, 180, 270].map((bearing) => destination(point, point.radius!, bearing))] : [point]
  )
}

/** A radius held to [min, max] and rounded to `step` (from `min`, as a slider steps). */
export function clampRadius(metres: number, min: number, max: number, step: number): number {
  const stepped = step > 0 ? min + Math.round((metres - min) / step) * step : metres
  return Math.min(max, Math.max(min, Math.round(stepped * 1000) / 1000))
}
