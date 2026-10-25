import { addressFieldMessages, getAddressFieldMessages } from "./messages.js"
/**
 * Address lookup behind a host-supplied adapter. The default browser adapter requests
 * GET /api/geocode on the application's origin; Glass UX does not provide that server.
 * Supply a GeocoderAdapter, or implement the Photon-compatible response contract
 * described in docs/components/address-field.md. The application chooses its provider,
 * authentication, caching, rate limits and privacy policy.
 */
import { emptyAddress, localityLine, resolveRegion, type AddressValue, type GeoPoint } from "./address.js"
import { countryName } from "../country-select/countries.js"
import { getLocale } from "../../lib/locale/locale.js"

/** Where results should lean: a point (the workspace's home region) and how wide an area. */
export interface GeocoderBias extends GeoPoint {
  /** Roughly a map zoom: 5 a state, 9 a city, 12 a suburb. Default 7. */
  zoom?: number
}

export interface GeocoderQuery {
  signal: AbortSignal
  bias?: GeocoderBias
  /** ISO 3166-1 alpha-2 codes results must be in. */
  countries?: readonly string[]
  /** Result language ("en"). */
  lang?: string
  limit?: number
}

/** What a suggestion is: a numbered address, a street, or a place without a street. */
export type AddressSuggestionKind = "address" | "street" | "place"

export interface AddressSuggestion {
  /** Stable for the result ("photon:W295479631"). */
  id: string
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: AddressSuggestionKind
  /** First line of the row: "12 Example Lane", or a place's name. */
  label: string
  /** Second line: "Hobart TAS 7000" (the caller adds a foreign country). */
  description: string
  /** The address it fills in, with its point. */
  value: AddressValue
}

export interface GeocoderAttribution {
  /** "Search by Photon" */
  provider: string
  providerHref?: string
  /** "© OpenStreetMap contributors" */
  data: string
  dataHref?: string
}

export interface GeocoderAdapter {
  search(query: string, options: GeocoderQuery): Promise<AddressSuggestion[]>
  /** Shown in the suggestions' footer, as the data licence requires. */
  attribution: GeocoderAttribution
  /** Characters before the first lookup. Default 3. */
  minChars?: number
  /** Pause after typing before a lookup, in ms. Default 300. */
  debounceMs?: number
}

/* ── Photon ─────────────────────────────────────────────────────────────────── */

/** One Photon (GeocodeJSON) feature, as the API returns it. */
export interface PhotonFeature {
  /** Semantic content or control type. */
  type: "Feature"
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: {
    osm_type?: string
    osm_id?: number
    osm_key?: string
    osm_value?: string
    /** Semantic content or control type. */
    type?: string
    name?: string
    housenumber?: string
    street?: string
    locality?: string
    district?: string
    city?: string
    county?: string
    /** Controlled view state, including loading, empty and error states. */
    state?: string
    postcode?: string
    country?: string
    countrycode?: string
  }
}

export interface PhotonOptions {
  /** The Photon server. Default the public instance, https://photon.komoot.io. */
  url?: string
  /** Result language when the query does not set one. Default "en". */
  lang?: string
  /** Default 6. */
  limit?: number
  /** Photon layers to search. Default: house, street, locality, district, city. */
  layers?: readonly string[]
  /** For a self-hosted instance with its own terms. */
  attribution?: Partial<GeocoderAttribution>
}

/** A house number typed before the street ("120 Crown St", "3/45 Main Road", "12A Smith St"). */
export function houseNumberOf(query: string): string | null {
  const match = /^\s*((?:unit\s+|u)?\d+[a-z]?(?:\s*[/-]\s*\d+[a-z]?)?)[\s,]+\D/i.exec(query)
  return match ? (match[1] ?? "").replace(/\s+/g, "") : null
}

/**
 * Photon → AddressValue. The suburb is the district in Australia (Sydney's "Surry Hills"),
 * the city elsewhere. A street result keeps the house number the person typed, since the
 * geocoder could not match it but the street is right. The country is named in `lang`
 * (a BCP 47 locale; default `getLocale()`).
 */
export function photonToSuggestion(feature: PhotonFeature, query = "", lang = getLocale()): AddressSuggestion | null {
  const p = feature.properties
  const [lng, lat] = feature.geometry?.coordinates ?? []
  if (typeof lat !== "number" || typeof lng !== "number") return null
  const countryCode = (p.countrycode ?? "").toUpperCase()
  const layer = p.type ?? ""
  const isStreetResult = layer === "street"
  const street = p.street ?? (isStreetResult ? p.name : undefined)
  const typedNumber = isStreetResult ? houseNumberOf(query) : null
  const number = p.housenumber ?? typedNumber ?? ""
  const line1 = street ? [number, street].filter(Boolean).join(" ") : ""
  const suburbFirst = countryCode === "AU"
  const locality = (suburbFirst ? (p.district ?? p.city) : (p.city ?? p.district)) ?? p.locality ?? (["city", "locality", "district"].includes(layer) ? p.name : undefined) ?? p.county ?? ""
  const value: AddressValue = {
    ...emptyAddress(),
    line1,
    locality,
    region: resolveRegion(countryCode, p.state ?? ""),
    postcode: p.postcode ?? "",
    country: { code: countryCode, name: countryCode ? countryName(countryCode, lang) : (p.country ?? "") },
    location: { lat, lng },
    pinned: false,
  }
  // A typed number on a street match is the person's, not the geocoder's: the point is on the street.
  const kind: AddressSuggestionKind = p.housenumber && street ? "address" : street ? "street" : "place"
  // A named place at an address (a gallery, a school) leads with its name.
  const named = p.name && p.name !== street && kind !== "street" && layer !== "city" && layer !== "locality" && layer !== "district" ? p.name : ""
  const place = localityLine(value)
  const label = named || line1 || value.locality || p.name || value.region.name || value.country.name
  // A town on its own: the rest of its line ("TAS 7190"). The country is left to the caller,
  // which names it only when it is not the home country.
  const rest = label === value.locality ? place.slice(value.locality.length).replace(/^,?\s*/, "") : place
  const description = [named ? line1 : "", rest].filter(Boolean).join(", ")
  return {
    id: `photon:${p.osm_type ?? "X"}${p.osm_id ?? `${lat},${lng}`}${typedNumber ? `#${typedNumber}` : ""}`,
    kind,
    label,
    description,
    value,
  }
}

/** Map a whole Photon response, dropping duplicates (same label and description). */
export function photonToSuggestions(features: readonly PhotonFeature[], query = "", lang?: string): AddressSuggestion[] {
  const seen = new Set<string>()
  const out: AddressSuggestion[] = []
  for (const feature of features) {
    const suggestion = photonToSuggestion(feature, query, lang)
    if (!suggestion) continue
    const key = `${suggestion.label}|${suggestion.description}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(suggestion)
  }
  return out
}

/** The public Photon instance, the default `url` for `createPhotonGeocoder`. Requests to it reach a third party. */
export const PHOTON_PUBLIC_URL = "https://photon.komoot.io"

const PHOTON_ATTRIBUTION: GeocoderAttribution = {
  provider: addressFieldMessages.defaults.searchByPhoton,
  providerHref: "https://photon.komoot.io",
  data: addressFieldMessages.defaults.openstreetmapContributors,
  dataHref: "https://www.openstreetmap.org/copyright",
}

const attributionDefaults = new WeakMap<GeocoderAttribution, { provider: boolean; data: boolean }>()
function photonAttribution(overrides: Partial<GeocoderAttribution> = {}): GeocoderAttribution {
  const attribution = { ...PHOTON_ATTRIBUTION, ...overrides }
  attributionDefaults.set(attribution, { provider: overrides.provider === undefined, data: overrides.data === undefined })
  return attribution
}

/** Resolve only built-in attribution wording; application attribution stays as supplied. */
export function localiseGeocoderAttribution(attribution: GeocoderAttribution, messages: typeof addressFieldMessages.defaults): GeocoderAttribution {
  const defaults = attributionDefaults.get(attribution)
  return {
    ...attribution,
    provider: defaults?.provider ? messages.searchByPhoton : attribution.provider,
    data: defaults?.data ? messages.openstreetmapContributors : attribution.data,
  }
}


export interface ServerGeocoderOptions {
/** The server route. Default "/api/geocode" (same origin). */
  url?: string
  /** Result language when the query does not set one. Default "en". */
  lang?: string
  /** Default 6, at most 10. */
  limit?: number
  /** Credit for the server's upstream. Default Photon and OpenStreetMap. */
  attribution?: Partial<GeocoderAttribution>
}

/** Thrown for a failed lookup; `code` is the server's ("RATE_LIMITED", "GEOCODER_TIMEOUT"…). */
export class GeocoderError extends Error {
  constructor(
    readonly status: number,
    readonly code: string
  ) {
    super(getAddressFieldMessages().addressLookupFailed(status, code ? ` ${code}` : ""))
    this.name = "GeocoderError"
  }
}

/**
 * The default adapter for the host application's Photon-compatible server route.
 * Same-origin credentials are included; the host implements the endpoint.
 */
export function createServerGeocoder(options: ServerGeocoderOptions = {}): GeocoderAdapter {
  const route = options.url ?? "/api/geocode"
  return {
    minChars: 3,
    debounceMs: 300,
    attribution: photonAttribution(options.attribution),
    async search(query, { signal, bias, countries, lang, limit }) {
      const params = new URLSearchParams({ q: query, limit: String(Math.min(limit ?? options.limit ?? 6, 10)), lang: lang ?? options.lang ?? "en" })
      for (const country of countries ?? []) params.append("country", country.toUpperCase())
      if (bias) {
        params.set("lat", bias.lat.toFixed(4))
        params.set("lon", bias.lng.toFixed(4))
        params.set("zoom", String(Math.round(bias.zoom ?? 7)))
      }
      const response = await fetch(`${route}?${params}`, { signal, credentials: "same-origin", headers: { Accept: "application/json" } })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: string } | null
        throw new GeocoderError(response.status, body?.code ?? "")
      }
      const body = (await response.json()) as { features?: PhotonFeature[] }
      return photonToSuggestions(body.features ?? [], query)
    },
  }
}

/**
 * Browser → Photon directly. For a self-hosted Photon on the customer's network, and tests. The
 * default `url` is the public instance, which would hand a third party the visitor's IP and
 * what was typed: Glass UX uses `createServerGeocoder` instead.
 */
export function createPhotonGeocoder(options: PhotonOptions = {}): GeocoderAdapter {
  const base = (options.url ?? PHOTON_PUBLIC_URL).replace(/\/$/, "")
  const layers = options.layers ?? ["house", "street", "locality", "district", "city"]
  return {
    minChars: 3,
    debounceMs: 300,
    attribution: photonAttribution(options.attribution),
    async search(query, { signal, bias, countries, lang, limit }) {
      const params = new URLSearchParams({ q: query, limit: String(limit ?? options.limit ?? 6), lang: lang ?? options.lang ?? "en" })
      for (const layer of layers) params.append("layer", layer)
      for (const country of countries ?? []) params.append("countrycode", country.toUpperCase())
      if (bias) {
        params.set("lat", String(bias.lat))
        params.set("lon", String(bias.lng))
        params.set("zoom", String(bias.zoom ?? 7))
        params.set("location_bias_scale", "0.3")
      }
      const response = await fetch(`${base}/api?${params}`, { signal, headers: { Accept: "application/json" } })
      if (!response.ok) throw new Error(getAddressFieldMessages().lookupStatusError(response.status))
      const body = (await response.json()) as { features?: PhotonFeature[] }
      return photonToSuggestions(body.features ?? [], query)
    },
  }
}
