/**
 * The MapLibre style, generated from Glass UX tokens (resolved by theme.ts) against the
 * OpenMapTiles vector schema, so the map recolours with the palette, the mode and the glass
 * setting. Nothing is borrowed from a third-party style: every colour, opacity, width and
 * font below comes from the theme or from these ramps. Pure: the same theme and inputs give
 * the same style, which lets a theme change go through `setStyle(style, { diff: true })` as
 * paint updates.
 *
 * The look, bottom to top:
 *   (no background)  the Glass UX canvas shows through: at state zoom the land is the canvas and
 *                    the home region's near-transparent fill lifts it
 *   water            a tint that fades in from zoom 5, so the detailed coastline takes over
 *                    from the outline as you zoom in; rivers from 9
 *   ground           landcover, parks and built-up land from 9, buildings from 14: faint ink
 *   transport        motorways from 5, trunk and primary from 7, secondary and tertiary from
 *                    9, local streets from 12, rail and paths from 13, runways from 11
 *   boundaries       state and country lines, dashed and faint
 *   regions          other regions that hold points: a faint line in the glow colour
 *   home             the home region: a near-transparent fill under three stacked lines (a wide
 *                    blurred halo, a medium glow, a crisp core) that ease off past zoom 9
 *   labels           few and muted at state zoom (cities), more as you zoom: towns from 7.5,
 *                    villages from 10, suburbs and localities from 12, roads from 13, water
 *                    names in italic from 8; every label on a canvas-coloured halo
 *   markers          an invisible footprint of every DOM marker (and its label), placed first,
 *                    so place names move or hide rather than sit under a marker
 */
import type * as GeoJSON from "geojson"
import type { ExpressionSpecification, LayerSpecification, SourceSpecification, StyleSpecification } from "maplibre-gl"
import { statusClusterProperties } from "./cluster.js"
import type { MapBasemap, MapRegion } from "./types.js"

/** Resolved token colours (rgba strings) and the mode they came from. */
export interface MapTheme {
  /** Active display or interaction mode. */
  mode: "light" | "dark"
  /** The home region's glow: the data hue (--chart-1), never the brand accent. */
  glow: string
  /** The glow's crisp core: the glow hue pulled toward the ink. */
  glowCore: string
  land: string
  water: string
  road: string
  roadMajor: string
  boundary: string
  building: string
  label: string
  labelStrong: string
  labelHalo: string
}

export interface MapStyleInput {
  theme: MapTheme
  basemap: MapBasemap | null
  /** Relative URLs resolve against this (workers need absolute ones). */
  origin?: string
  home: MapRegion | null
  regions: readonly MapRegion[]
  /** Geographical or chart points. */
  points: GeoJSON.FeatureCollection<GeoJSON.Point>
  /** Clusters break apart above this zoom. */
  clusterMaxZoom?: number
  /** Cluster radius in screen pixels. */
  clusterRadius?: number
}

export const SOURCE = { basemap: "basemap", home: "home", regions: "regions", points: "points" } as const
export const POINTS_LAYER = "points-anchor"

/**
 * The markers are DOM, so the map's own labels cannot see them. An invisible symbol at every
 * marker, sized like it, takes part in label placement instead: it always places (it is the
 * top layer, placed first, and may overlap other markers) and every basemap label must avoid
 * it, moving to another side or hiding. Its image is a transparent square (engine.ts).
 */
export const MARKER_ANCHOR_IMAGE = "fa-marker-anchor"
/** The anchor image's side in CSS pixels; icon-size scales it to each marker. */
export const MARKER_ANCHOR_SIZE = 48

/** Marker boxes in CSS pixels (map.css): a site's dot and ring, and the three cluster sizes. */
export const MARKER_BOX = { point: 24, cluster: { sm: 36, md: 42, lg: 48 } } as const
/** Clusters step up a size at these point counts (map.tsx). */
export const CLUSTER_STEPS = { md: 8, lg: 25 } as const
/** Site labels appear from this zoom (map.tsx shows them in the DOM). */
export const MARKER_LABEL_ZOOM = 8.5

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] }

type Stops = ReadonlyArray<readonly [zoom: number, value: number]>

/** Interpolate over zoom: linear, or exponential with a base (line widths). */
export function byZoom(stops: Stops, curve: "linear" | number = "linear"): ExpressionSpecification {
  const interpolation = curve === "linear" ? (["linear"] as const) : (["exponential", curve] as const)
  return ["interpolate", interpolation, ["zoom"], ...stops.flat()] as unknown as ExpressionSpecification
}

/** Scale every value of a ramp (more ink on a light canvas). */
const scaled = (stops: Stops, factor: number): Stops => stops.map(([zoom, value]) => [zoom, Math.round(value * factor * 1000) / 1000] as const)

const isLine: ExpressionSpecification = ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false]
const isPolygon: ExpressionSpecification = ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false]
const classIn = (...classes: string[]): ExpressionSpecification => ["match", ["get", "class"], classes, true, false]
const notTunnel: ExpressionSpecification = ["!=", ["coalesce", ["get", "brunnel"], ""], "tunnel"]

/** English where the tiles carry it, else the Latin form, else the local name. */
const NAME: ExpressionSpecification = ["coalesce", ["get", "name_en"], ["get", "name:latin"], ["get", "name"]]

function tileSource(basemap: MapBasemap, origin: string | undefined): SourceSpecification {
  const absolute = (url: string) => (origin && !/^[a-z]+:/i.test(url) ? new URL(url, origin).href : url)
  const { source } = basemap
  if (source.type === "tilejson") return { type: "vector", url: absolute(source.url), maxzoom: basemap.maxZoom }
  return { type: "vector", tiles: source.tiles.map(absolute), maxzoom: basemap.maxZoom }
}

interface RoadClass {
  id: string
  classes: string[]
  minzoom: number
  colour: string
  /** Opacity ramp before the light-canvas factor. */
  opacity: Stops
  /** Available width or named width tier. */
  width: Stops
  dash?: number[]
}

function basemapLayers(theme: MapTheme, fonts: MapBasemap["fonts"]): { ground: LayerSpecification[]; labels: LayerSpecification[] } {
  const dark = theme.mode === "dark"
  // A light canvas needs a little more ink for the same presence.
  const ink = dark ? 1 : 1.15
  const source = SOURCE.basemap
  const halo = { "text-halo-color": theme.labelHalo, "text-halo-width": 1.4, "text-halo-blur": 0.4 }

  const roads: RoadClass[] = [
    { id: "roads-path", classes: ["path"], minzoom: 14, colour: theme.road, opacity: [[14, 0], [15, 0.35]], width: [[14, 0.5], [18, 1.5]], dash: [2, 2] },
    { id: "roads-rail", classes: ["rail", "transit"], minzoom: 12, colour: theme.road, opacity: [[12, 0], [14, 0.4]], width: [[12, 0.5], [18, 1.5]], dash: [3, 3] },
    { id: "roads-local", classes: ["minor", "service", "track", "raceway", "busway"], minzoom: 11.5, colour: theme.road, opacity: [[11.5, 0], [13, 0.45], [16, 0.6]], width: [[12, 0.4], [14, 1.2], [18, 7]] },
    { id: "roads-secondary", classes: ["secondary", "tertiary"], minzoom: 9, colour: theme.road, opacity: [[9, 0], [11, 0.45], [14, 0.6]], width: [[9, 0.4], [12, 1.2], [18, 9]] },
    { id: "roads-primary", classes: ["primary", "trunk"], minzoom: 6.5, colour: theme.roadMajor, opacity: [[6.5, 0], [8.5, 0.4], [13, 0.6]], width: [[7, 0.5], [12, 1.6], [18, 11]] },
    { id: "roads-motorway", classes: ["motorway"], minzoom: 5, colour: theme.roadMajor, opacity: [[5, 0], [7, 0.45], [12, 0.65]], width: [[5, 0.5], [10, 1.6], [18, 12]] },
  ]

  const ground: LayerSpecification[] = [
    {
      id: "water",
      type: "fill",
      source,
      "source-layer": "water",
      filter: ["all", isPolygon, notTunnel],
      paint: { "fill-color": theme.water, "fill-opacity": byZoom(scaled([[3, 0.12], [6, 0.18], [9, 0.38], [12, 0.55]], dark ? 1 : 1.2)), "fill-antialias": false },
    },
    {
      id: "landcover",
      type: "fill",
      source,
      "source-layer": "landcover",
      minzoom: 9,
      filter: classIn("wood", "grass", "wetland", "farmland", "sand", "ice", "rock"),
      paint: { "fill-color": theme.land, "fill-opacity": byZoom(scaled([[9, 0], [12, 0.035]], ink)), "fill-antialias": false },
    },
    {
      id: "park",
      type: "fill",
      source,
      "source-layer": "park",
      minzoom: 9,
      paint: { "fill-color": theme.land, "fill-opacity": byZoom(scaled([[9, 0], [12, 0.045]], ink)), "fill-antialias": false },
    },
    {
      id: "landuse",
      type: "fill",
      source,
      "source-layer": "landuse",
      minzoom: 10,
      filter: classIn("residential", "suburb", "neighbourhood", "commercial", "industrial", "retail", "school", "hospital", "university", "college"),
      paint: { "fill-color": theme.land, "fill-opacity": byZoom(scaled([[10, 0], [13, 0.05]], ink)), "fill-antialias": false },
    },
    {
      id: "waterway",
      type: "line",
      source,
      "source-layer": "waterway",
      minzoom: 9,
      filter: ["all", isLine, notTunnel],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": theme.water, "line-opacity": byZoom([[9, 0], [12, 0.8]]), "line-width": byZoom([[9, 0.5], [16, 2.5]], 1.4) },
    },
    {
      id: "aeroway",
      type: "line",
      source,
      "source-layer": "aeroway",
      minzoom: 11,
      filter: ["all", isLine, classIn("runway", "taxiway")],
      paint: { "line-color": theme.road, "line-opacity": byZoom(scaled([[11, 0], [13, 0.4]], ink)), "line-width": byZoom([[11, 1], [16, 18]], 1.5) },
    },
    {
      id: "building",
      type: "fill",
      source,
      "source-layer": "building",
      minzoom: 14,
      paint: { "fill-color": theme.building, "fill-opacity": byZoom(scaled([[14, 0], [16, 0.1]], ink)) },
    },
    ...roads.map(
      (road): LayerSpecification => ({
        id: road.id,
        type: "line",
        source,
        "source-layer": "transportation",
        minzoom: road.minzoom,
        filter: ["all", isLine, classIn(...road.classes)],
        layout: { "line-cap": road.dash ? "butt" : "round", "line-join": "round" },
        paint: {
          "line-color": road.colour,
          "line-opacity": byZoom(scaled(road.opacity, ink)),
          "line-width": byZoom(road.width, 1.6),
          ...(road.dash ? { "line-dasharray": road.dash } : {}),
        },
      })
    ),
    {
      id: "boundaries",
      type: "line",
      source,
      "source-layer": "boundary",
      filter: ["all", ["match", ["get", "admin_level"], [2, 4], true, false], ["!=", ["coalesce", ["get", "maritime"], 0], 1]],
      layout: { "line-join": "round" },
      paint: {
        "line-color": theme.boundary,
        "line-opacity": byZoom(scaled([[2, 0.3], [8, 0.45]], ink)),
        "line-width": ["match", ["get", "admin_level"], 2, 1, 0.75],
        "line-dasharray": [3, 2],
      },
    },
  ]

  const place = (id: string, classes: string[], minzoom: number, size: Stops, colour: string | ExpressionSpecification, font: string, maxzoom?: number): LayerSpecification => ({
    id,
    type: "symbol",
    source,
    "source-layer": "place",
    minzoom,
    ...(maxzoom ? { maxzoom } : {}),
    filter: classIn(...classes),
    layout: {
      "text-field": NAME,
      "text-font": [font],
      "text-size": byZoom(size),
      "text-letter-spacing": 0.02,
      "text-max-width": 8,
      "text-padding": 4,
      // Blocked by a marker, a place name tries the other sides before it gives way.
      "text-variable-anchor": ["center", "top", "bottom", "right", "left"],
      "text-radial-offset": 0.9,
      "symbol-sort-key": ["coalesce", ["get", "rank"], 99],
    },
    paint: { "text-color": colour, ...halo, "text-opacity": byZoom([[minzoom, 0], [minzoom + 0.75, 1]]) },
  })

  const labels: LayerSpecification[] = [
    {
      id: "labels-water",
      type: "symbol",
      source,
      "source-layer": "water_name",
      minzoom: 8,
      filter: ["all", ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false], classIn("bay", "sea", "lake", "lagoon", "reservoir", "strait")],
      layout: { "text-field": NAME, "text-font": [fonts.italic], "text-size": byZoom([[8, 10], [14, 13]]), "text-max-width": 7 },
      paint: { "text-color": theme.label, ...halo, "text-opacity": byZoom([[8, 0], [9, 0.8]]) },
    },
    {
      id: "labels-roads",
      type: "symbol",
      source,
      "source-layer": "transportation_name",
      minzoom: 13,
      filter: classIn("motorway", "trunk", "primary", "secondary", "tertiary", "minor"),
      layout: { "symbol-placement": "line", "text-field": NAME, "text-font": [fonts.regular], "text-size": byZoom([[13, 10], [17, 12]]), "text-max-angle": 30 },
      paint: { "text-color": theme.label, ...halo, "text-opacity": byZoom([[13, 0], [14, 1]]) },
    },
    place("labels-local", ["suburb", "neighbourhood", "quarter", "hamlet", "locality", "isolated_dwelling"], 12, [[12, 10], [16, 13]], theme.label, fonts.regular),
    place("labels-villages", ["village"], 10, [[10, 10.5], [15, 14]], theme.label, fonts.regular),
    place("labels-towns", ["town"], 7.5, [[7.5, 11], [14, 16]], theme.label, fonts.regular),
    place("labels-cities", ["city"], 5, [[5, 11.5], [14, 18]], ["step", ["zoom"], theme.label, 9, theme.labelStrong], fonts.bold),
    place("labels-countries", ["country"], 1.5, [[1.5, 10], [5, 13]], theme.label, fonts.bold, 6),
  ]
  return { ground, labels }
}

function homeLayers(theme: MapTheme): LayerSpecification[] {
  const dark = theme.mode === "dark"
  const halo = dark ? 0.5 : 0.32
  const glow = dark ? 0.6 : 0.45
  // The outline is the hero at state zoom and steps back once the basemap's own coastline is
  // detailed enough to take over.
  const fade = (peak: number) => byZoom([[0, peak], [9, peak], [11.5, peak * 0.3], [14, 0]])
  return [
    {
      id: "home-fill",
      type: "fill",
      source: SOURCE.home,
      paint: { "fill-color": theme.glow, "fill-opacity": byZoom([[4, dark ? 0.07 : 0.06], [9, 0.035], [12, 0]]), "fill-antialias": false },
    },
    {
      id: "home-glow-wide",
      type: "line",
      source: SOURCE.home,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": theme.glow, "line-opacity": fade(halo), "line-width": byZoom([[3, 10], [7, 22], [10, 30]]), "line-blur": byZoom([[3, 8], [7, 16], [10, 22]]) },
    },
    {
      id: "home-glow",
      type: "line",
      source: SOURCE.home,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": theme.glow, "line-opacity": fade(glow), "line-width": byZoom([[3, 3], [7, 6], [10, 8]]), "line-blur": byZoom([[3, 2], [7, 4], [10, 5]]) },
    },
    {
      id: "home-core",
      type: "line",
      source: SOURCE.home,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": theme.glowCore, "line-opacity": fade(1), "line-width": byZoom([[3, 1], [7, 1.5], [10, 2]]) },
    },
  ]
}

function regionLayers(theme: MapTheme): LayerSpecification[] {
  return [
    {
      id: "regions-line",
      type: "line",
      source: SOURCE.regions,
      layout: { "line-join": "round" },
      paint: { "line-color": theme.glow, "line-opacity": byZoom([[0, 0.3], [9, 0.3], [12, 0]]), "line-width": 1, "line-blur": 0.5 },
    },
  ]
}

/**
 * The markers' footprint for label placement (see MARKER_ANCHOR_IMAGE): an invisible icon the
 * size of each marker and, where the map has glyphs, the site's name to its right from the
 * zoom the DOM label appears, so place names avoid both. It also keeps the clustered source
 * loaded, which is how the engine finds the markers.
 */
function markerAnchorLayer(font: string | null): LayerSpecification {
  const scale = (px: number) => px / MARKER_ANCHOR_SIZE
  const { point, cluster } = MARKER_BOX
  return {
    id: POINTS_LAYER,
    type: "symbol",
    source: SOURCE.points,
    layout: {
      "icon-image": MARKER_ANCHOR_IMAGE,
      "icon-size": ["case", ["has", "point_count"], ["step", ["get", "point_count"], scale(cluster.sm), CLUSTER_STEPS.md, scale(cluster.md), CLUSTER_STEPS.lg, scale(cluster.lg)], scale(point)],
      "icon-allow-overlap": true,
      "icon-ignore-placement": false,
      "icon-padding": 2,
      ...(font
        ? {
            // Zoom must lead the expression; clusters carry no label, so theirs is empty.
            "text-field": ["step", ["zoom"], "", MARKER_LABEL_ZOOM, ["coalesce", ["get", "label"], ""]],
            "text-font": [font],
            "text-size": 12,
            "text-anchor": "left",
            // Past the dot (12px) and the label's own inset: ems of the 12px text.
            "text-offset": [1.15, 0],
            "text-allow-overlap": true,
            "text-ignore-placement": false,
            "text-max-width": 30,
          }
        : {}),
    },
    paint: { "icon-opacity": 0, "text-opacity": 0 },
  } as LayerSpecification
}

/** The style. Data (home, regions, points) is part of it so a diffed setStyle keeps it. */
export function createMapStyle(input: MapStyleInput): StyleSpecification {
  const { theme, basemap } = input
  const sources: Record<string, SourceSpecification> = {
    // A little extra simplification keeps the glow smooth at state zoom; detail returns as you zoom.
    [SOURCE.home]: { type: "geojson", data: (input.home ?? EMPTY) as GeoJSON.GeoJSON, tolerance: 1.2 },
    [SOURCE.regions]: { type: "geojson", data: { type: "FeatureCollection", features: input.regions as unknown as GeoJSON.Feature[] } },
    [SOURCE.points]: {
      type: "geojson",
      data: input.points,
      cluster: true,
      clusterRadius: input.clusterRadius ?? 44,
      clusterMaxZoom: input.clusterMaxZoom ?? 12,
      clusterProperties: statusClusterProperties(),
    },
  }
  if (basemap) sources[SOURCE.basemap] = tileSource(basemap, input.origin)
  const base = basemap ? basemapLayers(theme, basemap.fonts) : { ground: [], labels: [] }
  return {
    version: 8,
    name: "Glass UX",
    ...(basemap ? { glyphs: basemap.glyphs } : {}),
    sources,
    layers: [
      ...base.ground,
      ...regionLayers(theme),
      ...homeLayers(theme),
      ...base.labels,
      markerAnchorLayer(basemap?.fonts.bold ?? null),
    ],
  }
}

/** Points as the clustered source's GeoJSON. */
export function pointsToGeoJSON(points: ReadonlyArray<{ id: string; lng: number; lat: number; status: string; label?: string }>): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      properties: { id: point.id, status: point.status, label: point.label ?? "" },
      geometry: { type: "Point", coordinates: [point.lng, point.lat] },
    })),
  }
}
