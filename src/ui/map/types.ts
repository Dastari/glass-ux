/**
 * The map's public types. The map is generic: it plots points with a status anywhere in the
 * world, outlines a home region and draws a vector basemap. What a point *is* (a site, a
 * device, a branch) belongs to the caller, carried in `data`.
 */
import type { MapStatus } from "./cluster.js"
import type { LngLatBox } from "./projection.js"

export type { MapStatus } from "./cluster.js"
export type { LngLatBox } from "./projection.js"

/** A plotted point. */
export interface MapPoint<T = unknown> {
  /** Stable id: selection, focus and pulses follow it across updates. */
  id: string
  lng: number
  lat: number
  /** Current operation or connection status. */
  status: MapStatus
  /** The marker's label as you zoom in, and its accessible name: "Cedar Vale Library". */
  label: string
  /** Read after the label by assistive tech and in the outside-view list: "Northstar Studio". */
  description?: string
  /** Typed records rendered by the component. */
  data: T
}

/** Credit shown by the attribution control. */
export interface MapAttribution {
  /** "Data © OpenStreetMap contributors" */
  label: string
  /** The compact line's form: "Data © OpenStreetMap contributors". Without one the credit appears only behind ⓘ. */
  short?: string
  /**
   * The form that stays visible however small the map: "© OpenStreetMap". A credit the data
   * licence requires on screen sets it (OSM's attribution guidelines); others drop to ⓘ.
   */
  minimal?: string
  href?: string
  /** "ODbL 1.0" */
  licence?: string
}

/**
 * Where the basemap's vector tiles come from. The style targets the OpenMapTiles schema
 * (water, waterway, landcover, landuse, park, transportation, transportation_name, building,
 * boundary, place, aeroway…), served by any OpenMapTiles-compatible server:
 *   tilejson  a TileJSON document (OpenFreeMap: "https://tiles.openfreemap.org/planet")
 *   tiles     a z/x/y template ("https://tiles.example/planet/{z}/{x}/{y}.pbf")
 */
export type MapTileSource = { type: "tilejson"; url: string } | { type: "tiles"; tiles: readonly string[] }

export interface MapBasemap {
  /** The typed source adapter or asset definition consumed by this component. */
  source: MapTileSource
  schema: "openmaptiles"
  /** The deepest zoom the tiles carry; the map overzooms beyond it. */
  maxZoom: number
  /** Label glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf". */
  glyphs: string
  /** Font stacks the glyph server carries. */
  fonts: { regular: string; bold: string; italic: string }
  attribution: readonly MapAttribution[]
}

/** Everything that is deployment, not data: tile and outline sources, zoom limits, credits. */
export interface MapConfig {
  /** Null draws outlines and points with no basemap. */
  basemap: MapBasemap | null
  /** Region outline URL template: "/geo/admin1/{country}/{code}.json". */
  regions: string
  regionAttribution: MapAttribution
  minZoom: number
  maxZoom: number
}

/** An admin-1 region outline (the files public/geo/admin1/<country>/<code>.json). */
export interface MapRegion {
  /** Semantic content or control type. */
  type: "Feature"
  /** Every polygon. */
  bbox: LngLatBox
  properties: {
    /** ISO 3166-2: "AU-TAS". */
    code: string
    /** ISO 3166-1 alpha-2: "AU". */
    country: string
    name: string
    /** Semantic content or control type. */
    type?: string | null
    /** The main landmass and the islands near it: what the map fits on. */
    focus: LngLatBox
  }
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown }
}

/** A cluster as the popup and the keyboard list see it. */
export interface MapCluster<T = unknown> {
  id: number
  lng: number
  lat: number
  /** The points in it, worst status first. */
  points: readonly MapPoint<T>[]
}

/** How the camera frames the data on load and when `frameKey` changes. */
export type MapFrame = "home" | "points"
