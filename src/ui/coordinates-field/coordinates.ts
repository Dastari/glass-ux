/**
 * Latitude and longitude (WGS 84) from whatever people paste:
 *
 *   "-42.88334, 147.32688"  "-42.88334 147.32688"  "42.88334S 147.32688E"  "S42.88334 E147.32688"
 *   42°52′60″S 147°19′37″E   (degrees, minutes, seconds; ' and " work too)
 *   42° 52.998′ S, 147° 19.613′ E   (degrees and decimal minutes)
 *   Google Maps, OpenStreetMap and Apple Maps links, and geo: URIs (RFC 5870)
 *
 * A pair whose first number cannot be a latitude but whose second can (147.3, -42.9) is read as
 * longitude, latitude — GeoJSON order — and says so.
 */

export interface LatLng {
  lat: number
  lng: number
}

export type CoordinatesResult =
  | { ok: true; value: LatLng; swapped?: boolean }
  /** `raw` is set when the numbers were read but are out of range. */
  | { ok: false; error: string; raw?: LatLng }

/** 5 decimals is about a metre: as precise as a pin or a phone's GPS. */
export const COORDINATE_DECIMALS = 5

const round = (value: number, decimals = COORDINATE_DECIMALS) => {
  const factor = 10 ** decimals
  const rounded = Math.round(value * factor) / factor
  return Object.is(rounded, -0) ? 0 : rounded
}

/** "-42.88334, 147.32688" */
export function formatCoordinates(value: LatLng, decimals = COORDINATE_DECIMALS): string {
  return `${round(value.lat, decimals).toFixed(decimals)}, ${round(value.lng, decimals).toFixed(decimals)}`
}

/** One axis as degrees, minutes and seconds: 42°52′60.0″S. */
export function toDms(value: number, axis: "lat" | "lng", secondDecimals = 1): string {
  const hemisphere = axis === "lat" ? (value < 0 ? "S" : "N") : value < 0 ? "W" : "E"
  let rest = Math.abs(value)
  let degrees = Math.floor(rest)
  rest = (rest - degrees) * 60
  let minutes = Math.floor(rest)
  let seconds = Number(((rest - minutes) * 60).toFixed(secondDecimals))
  if (seconds >= 60) {
    seconds = 0
    minutes += 1
  }
  if (minutes >= 60) {
    minutes = 0
    degrees += 1
  }
  return `${degrees}°${minutes}′${seconds.toFixed(secondDecimals)}″${hemisphere}`
}

/** "42°52′60.0″S 147°19′36.8″E" */
export function formatDms(value: LatLng): string {
  return `${toDms(value.lat, "lat")} ${toDms(value.lng, "lng")}`
}

export const LATITUDE_RANGE = "Latitude must be between -90 and 90"
export const LONGITUDE_RANGE = "Longitude must be between -180 and 180"
export const COORDINATES_EXAMPLE = "Enter a latitude and longitude, such as -42.88334, 147.32688"

export const isLatitude = (value: number) => Number.isFinite(value) && value >= -90 && value <= 90
export const isLongitude = (value: number) => Number.isFinite(value) && value >= -180 && value <= 180

/** Coordinates inside a map link, or null. */
function fromLink(text: string): LatLng | null {
  // Google's place data (!3d<lat>!4d<lng>) is the place itself; @lat,lng is only the camera.
  const place = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(text)
  if (place) return { lat: Number(place[1]), lng: Number(place[2]) }
  const patterns = [
    /[?&](?:q|query|ll|sll|daddr|destination)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]mlat=(-?\d+(?:\.\d+)?)&mlon=(-?\d+(?:\.\d+)?)/i,
    /#map=\d+(?:\.\d+)?\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/i,
    /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i,
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) return { lat: Number(match[1]), lng: Number(match[2]) }
  }
  return null
}

const DEGREE = /[°º˚d]/
const MINUTE = /['′’]/
const SECOND = /["″”]|′′|''/

interface Axis {
  value: number
  hemisphere: "N" | "S" | "E" | "W" | null
}

/** One axis: signed decimal, or degrees with optional minutes and seconds, with a hemisphere letter before or after. */
function parseAxis(token: string): Axis | null {
  let source = token.trim().toUpperCase()
  let hemisphere: Axis["hemisphere"] = null
  const lead = /^([NSEW])\s*/.exec(source)
  const trail = /\s*([NSEW])$/.exec(source)
  if (lead) {
    hemisphere = lead[1] as Axis["hemisphere"]
    source = source.slice(lead[0].length)
  } else if (trail) {
    hemisphere = trail[1] as Axis["hemisphere"]
    source = source.slice(0, -trail[0].length)
  }
  source = source.trim()
  if (/^[-+−]?\d+(\.\d+)?$/.test(source)) return { value: Number(source.replace("−", "-")), hemisphere }
  // Degrees, minutes, seconds with symbols; spaces between parts are optional.
  const dms = new RegExp(
    `^([-+−]?\\d+(?:\\.\\d+)?)\\s*${DEGREE.source}\\s*(?:(\\d+(?:\\.\\d+)?)\\s*${MINUTE.source}\\s*)?(?:(\\d+(?:\\.\\d+)?)\\s*(?:${SECOND.source})\\s*)?$`,
    "i"
  ).exec(source)
  // Or plain space-separated parts: "42 52 59.9".
  const spaced = dms ? null : /^([-+−]?\d+)\s+(\d+(?:\.\d+)?)(?:\s+(\d+(?:\.\d+)?))?$/.exec(source)
  const match = dms ?? spaced
  if (!match) return null
  const degrees = Number((match[1] ?? "0").replace("−", "-"))
  const minutes = Number(match[2] ?? 0)
  const seconds = Number(match[3] ?? 0)
  if (minutes >= 60 || seconds >= 60) return null
  const magnitude = Math.abs(degrees) + minutes / 60 + seconds / 3600
  return { value: degrees < 0 || /^[-−]/.test(match[1] ?? "") ? -magnitude : magnitude, hemisphere }
}

const signed = (axis: Axis) => (axis.hemisphere === "S" || axis.hemisphere === "W" ? -Math.abs(axis.value) : axis.value)

/** Split a pair into its two axes: at a comma, a semicolon, or the hemisphere boundary. */
function splitPair(text: string): [string, string] | null {
  const source = text.trim().replace(/^\(|\)$/g, "")
  for (const separator of [",", ";"]) {
    const parts = source.split(separator)
    if (parts.length === 2) return [parts[0] ?? "", parts[1] ?? ""]
  }
  // "42°52′60″S 147°19′37″E" or "S42.9 E147.3": split after a trailing hemisphere or before a leading one.
  const hemisphere = /^(.*?[NS])\s+([EW]?.*)$/i.exec(source) ?? /^([NS].*?)\s+([EW].*)$/i.exec(source)
  if (hemisphere) return [hemisphere[1] ?? "", hemisphere[2] ?? ""]
  // Two plain numbers.
  const parts = source.split(/\s+/)
  if (parts.length === 2) return [parts[0] ?? "", parts[1] ?? ""]
  return null
}

/** Parse and validate; the value is rounded to COORDINATE_DECIMALS. */
export function parseCoordinates(text: string): CoordinatesResult {
  const source = text.trim()
  if (!source) return { ok: false, error: COORDINATES_EXAMPLE }
  const linked = /^(https?:|geo:)/i.test(source) ? fromLink(source) : null
  if (/^(https?:|geo:)/i.test(source) && !linked) return { ok: false, error: "That link has no coordinates in it — copy them from the map instead" }
  let pair: LatLng
  let swapped = false
  if (linked) {
    pair = linked
  } else {
    const parts = splitPair(source)
    if (!parts) return { ok: false, error: COORDINATES_EXAMPLE }
    const first = parseAxis(parts[0])
    const second = parseAxis(parts[1])
    if (!first || !second) return { ok: false, error: COORDINATES_EXAMPLE }
    const firstIsLng = first.hemisphere === "E" || first.hemisphere === "W"
    const secondIsLat = second.hemisphere === "N" || second.hemisphere === "S"
    if (firstIsLng || secondIsLat) {
      pair = { lat: signed(second), lng: signed(first) }
    } else if (!first.hemisphere && !second.hemisphere && Math.abs(first.value) > 90 && Math.abs(second.value) <= 90) {
      pair = { lat: second.value, lng: first.value }
      swapped = true
    } else {
      pair = { lat: signed(first), lng: signed(second) }
    }
  }
  if (!isLatitude(pair.lat)) return { ok: false, error: LATITUDE_RANGE, raw: pair }
  if (!isLongitude(pair.lng)) return { ok: false, error: LONGITUDE_RANGE, raw: pair }
  return { ok: true, value: { lat: round(pair.lat), lng: round(pair.lng) }, ...(swapped ? { swapped } : {}) }
}

/** Normalised "lat, lng" text, or null. */
export function normaliseCoordinates(text: string): string | null {
  const result = parseCoordinates(text)
  return result.ok ? formatCoordinates(result.value) : null
}
