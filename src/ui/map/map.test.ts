import { Supercluster } from "@maplibre/geojson-vt"
import { createExpression, validateStyleMin } from "@maplibre/maplibre-gl-style-spec"
import { afterEach, describe, expect, it, vi } from "vitest"
import { countKey, countsOf, countStatuses, describeCounts, MAP_STATUSES, ringSegments, statusClusterProperties, sumCounts, totalOf, worstOf, type MapStatus } from "./cluster.js"
import { luminance, parseColour, toCss } from "./colour.js"
import { nextMarker, readingOrder } from "./nav.js"
import { boxContains, boxOfPoints, projectX, projectY, ringsOf, ringsToPath, unprojectY, viewBoxOf } from "./projection.js"
import { loadRegion, regionUrl } from "./regions.js"
import { byZoom, createMapStyle, POINTS_LAYER, pointsToGeoJSON, SOURCE, type MapTheme } from "./style.js"
import type { MapBasemap, MapRegion } from "./types.js"

afterEach(() => {
  vi.unstubAllGlobals()
})

/* ── Colour ─────────────────────────────────────────────────────────────────── */

describe("parseColour", () => {
  const near = (actual: { r: number; g: number; b: number } | null, expected: [number, number, number], tolerance = 2) => {
    expect(actual).not.toBeNull()
    expect(Math.abs(actual!.r - expected[0])).toBeLessThanOrEqual(tolerance)
    expect(Math.abs(actual!.g - expected[1])).toBeLessThanOrEqual(tolerance)
    expect(Math.abs(actual!.b - expected[2])).toBeLessThanOrEqual(tolerance)
  }

  it("converts OKLCH the way the browser paints it", () => {
    near(parseColour("oklch(0.627955 0.257683 29.2339)"), [255, 0, 0])
    near(parseColour("oklch(1 0 0)"), [255, 255, 255])
    near(parseColour("oklch(0 0 0)"), [0, 0, 0])
    near(parseColour("oklch(62.7955% 0.257683 29.2339deg)"), [255, 0, 0])
    // Glass UX's light-mode --chart-1 at the default data hue: a calm blue.
    const blue = parseColour("oklch(0.58 0.15 250)")!
    expect(blue.b).toBeGreaterThan(blue.r + 80)
  })

  it("keeps alpha from every syntax", () => {
    expect(parseColour("oklch(0.6 0.1 250 / 0.4)")!.a).toBeCloseTo(0.4)
    expect(parseColour("oklab(0.5 0 0 / 25%)")!.a).toBeCloseTo(0.25)
    expect(parseColour("rgba(10, 20, 30, 0.5)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 })
    expect(parseColour("rgb(10 20 30 / 50%)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 })
    expect(parseColour("color(srgb 1 0 0 / 0.5)")).toEqual({ r: 255, g: 0, b: 0, a: 0.5 })
    expect(parseColour("transparent")!.a).toBe(0)
  })

  it("reads hex, oklab, color(srgb-linear) and display-p3, clipping to sRGB", () => {
    expect(parseColour("#ff8000")).toEqual({ r: 255, g: 128, b: 0, a: 1 })
    expect(parseColour("#0f08")).toEqual({ r: 0, g: 255, b: 0, a: 136 / 255 })
    near(parseColour("oklab(0.627955 0.224863 0.125846)"), [255, 0, 0])
    near(parseColour("color(srgb-linear 1 1 1)"), [255, 255, 255])
    near(parseColour("color(display-p3 1 0 0)"), [255, 0, 0])
  })

  it("returns null for what it cannot read", () => {
    expect(parseColour("var(--x)")).toBeNull()
    expect(parseColour("")).toBeNull()
    expect(parseColour("lab(50 0 0)")).toBeNull()
  })

  it("writes rgba strings with opacity applied", () => {
    expect(toCss({ r: 1, g: 2, b: 3, a: 0.5 }, 0.5)).toBe("rgba(1, 2, 3, 0.25)")
    expect(luminance({ r: 255, g: 255, b: 255, a: 1 })).toBeCloseTo(1)
  })
})

/* ── Clusters ───────────────────────────────────────────────────────────────── */

/** MapLibre's own wiring (geojson_worker_source.ts getSuperclusterOptions): the expressions in
 *  `clusterProperties` become supercluster's map and reduce. */
function superclusterFor(clusterProperties: Record<string, [string, unknown]>, radius: number, maxZoom: number) {
  const maps: Record<string, { evaluate: (globals: unknown, feature: unknown) => unknown }> = {}
  const reduces: typeof maps = {}
  const globals = { accumulated: null as unknown, zoom: 0 }
  const feature = { properties: null as unknown }
  for (const [key, [operator, map]] of Object.entries(clusterProperties)) {
    const parsedMap = createExpression(map, key)
    const parsedReduce = createExpression([operator, ["accumulated"], ["get", key]], key)
    if (parsedMap.result !== "success" || parsedReduce.result !== "success") throw new Error(`clusterProperties.${key} does not parse`)
    maps[key] = parsedMap.value as never
    reduces[key] = parsedReduce.value as never
  }
  const keys = Object.keys(clusterProperties)
  // MapLibre: extent 8192, radius in screen px × extent / tile size (512).
  return new Supercluster({
    radius: (radius * 8192) / 512,
    extent: 8192,
    maxZoom,
    map: (properties: Record<string, unknown>) => {
      feature.properties = properties
      return Object.fromEntries(keys.map((key) => [key, maps[key]!.evaluate(globals, feature)]))
    },
    reduce: (accumulated: Record<string, unknown>, properties: Record<string, unknown>) => {
      feature.properties = properties
      for (const key of keys) {
        globals.accumulated = accumulated[key]
        accumulated[key] = reduces[key]!.evaluate(globals, feature)
      }
    },
  } as never)
}

const SITES: Array<{ id: string; lng: number; lat: number; status: MapStatus }> = [
  { id: "swansea", lng: 148.0745, lat: -42.1237, status: "warning" },
  { id: "mossbridge-office", lng: 147.9115, lat: -42.5085, status: "healthy" },
  { id: "mossbridge-centre", lng: 147.9126, lat: -42.5106, status: "danger" },
  { id: "orford", lng: 147.8742, lat: -42.5603, status: "healthy" },
  { id: "bicheno", lng: 148.2932, lat: -41.8697, status: "unknown" },
  { id: "hobart", lng: 147.3257, lat: -42.8826, status: "healthy" },
  { id: "salamanca", lng: 147.3317, lat: -42.8872, status: "warning" },
  { id: "port-melbourne", lng: 144.9324, lat: -37.8318, status: "healthy" },
]

describe("status clusters", () => {
  it("declares one summed count per status", () => {
    const properties = statusClusterProperties()
    expect(Object.keys(properties)).toEqual(MAP_STATUSES.map(countKey))
    for (const [operator] of Object.values(properties)) expect(operator).toBe("+")
  })

  it("aggregates per-status counts the way MapLibre evaluates clusterProperties", () => {
    const index = superclusterFor(statusClusterProperties(), 44, 12)
    index.load(pointsToGeoJSON(SITES).features)
    const world: [number, number, number, number] = [-180, -85, 180, 85]

    // At state zoom the east-coast sites merge; the totals of every marker add up to the input.
    const state = index.getClusters(world, 6)
    const totals = sumCounts(state.map((feature) => countsOf(feature.properties as Record<string, unknown>)))
    expect(totals).toEqual(countStatuses(SITES))
    const clusters = state.filter((feature) => (feature.properties as Record<string, unknown>).cluster)
    expect(clusters.length).toBeGreaterThan(0)
    const biggest = clusters.map((feature) => countsOf(feature.properties as Record<string, unknown>)).toSorted((a, b) => totalOf(b) - totalOf(a))[0]!
    expect(worstOf(biggest)).toBe("danger")

    // Zoomed in, the two Mossbridge sites (300 m apart) still share a marker; at street zoom
    // every site stands alone.
    expect(index.getClusters(world, 13)).toHaveLength(SITES.length)
    const near = index.getClusters([147.9, -42.52, 147.92, -42.5], 9)
    expect(near).toHaveLength(1)
    expect(countsOf(near[0]!.properties as Record<string, unknown>)).toMatchObject({ danger: 1, healthy: 1 })
  })

  it("reads a lone point's status as its count", () => {
    expect(countsOf({ id: "x", status: "warning" })).toEqual({ danger: 0, warning: 1, healthy: 0, unknown: 0 })
    expect(countsOf({ id: "x", status: "nonsense" })).toEqual({ danger: 0, warning: 0, healthy: 0, unknown: 1 })
  })

  it("shows the worst status, and unknown only when nothing else is known", () => {
    expect(worstOf({ danger: 1, warning: 4, healthy: 40, unknown: 3 })).toBe("danger")
    expect(worstOf({ danger: 0, warning: 0, healthy: 1, unknown: 9 })).toBe("healthy")
    expect(worstOf({ danger: 0, warning: 0, healthy: 0, unknown: 2 })).toBe("unknown")
  })

  it("draws ring segments worst first, with a minimum sweep for rare statuses", () => {
    const segments = ringSegments({ danger: 1, warning: 0, healthy: 199, unknown: 0 }, 15)
    expect(segments.map((segment) => segment.status)).toEqual(["danger", "healthy"])
    expect(ringSegments({ danger: 0, warning: 0, healthy: 3, unknown: 0 }, 15)).toHaveLength(1)
    expect(ringSegments({ danger: 0, warning: 0, healthy: 0, unknown: 0 }, 15)).toEqual([])
    expect(describeCounts({ danger: 1, warning: 0, healthy: 3, unknown: 0 }, { danger: "critical", warning: "warning", healthy: "healthy", unknown: "offline" })).toBe("1 critical, 3 healthy")
  })
})

/* ── Style ──────────────────────────────────────────────────────────────────── */

const THEME: MapTheme = {
  mode: "dark",
  glow: "rgba(110, 160, 240, 1)",
  glowCore: "rgba(180, 205, 250, 1)",
  land: "rgba(200, 210, 230, 1)",
  water: "rgba(40, 60, 90, 1)",
  road: "rgba(150, 155, 170, 1)",
  roadMajor: "rgba(190, 195, 205, 1)",
  boundary: "rgba(150, 155, 170, 1)",
  building: "rgba(240, 240, 245, 1)",
  label: "rgba(190, 195, 205, 1)",
  labelStrong: "rgba(245, 246, 250, 1)",
  labelHalo: "rgba(20, 22, 30, 1)",
}

const BASEMAP: MapBasemap = {
  source: { type: "tilejson", url: "https://tiles.openfreemap.org/planet" },
  schema: "openmaptiles",
  maxZoom: 14,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  fonts: { regular: "Noto Sans Regular", bold: "Noto Sans Bold", italic: "Noto Sans Italic" },
  attribution: [{ label: "© OpenStreetMap", href: "https://www.openstreetmap.org/copyright", licence: "ODbL" }],
}

const TASMANIA: MapRegion = {
  type: "Feature",
  bbox: [143.8, -43.6, 148.5, -39.6],
  properties: { code: "AU-TAS", country: "AU", name: "Tasmania", type: "State", focus: [143.8, -43.6, 148.5, -39.6] },
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [145, -41],
          [148.3, -41],
          [148.3, -43.6],
          [145, -43.2],
          [145, -41],
        ],
      ],
    ],
  },
}

describe("createMapStyle", () => {
  const style = createMapStyle({ theme: THEME, basemap: BASEMAP, origin: "https://glass-ux.example/o/all", home: TASMANIA, regions: [], points: pointsToGeoJSON(SITES) })

  it("is a valid MapLibre style, with and without a basemap", () => {
    expect(validateStyleMin(style)).toEqual([])
    expect(validateStyleMin(createMapStyle({ theme: THEME, basemap: null, home: null, regions: [], points: pointsToGeoJSON([]) }))).toEqual([])
  })

  it("takes its tiles from the config: TileJSON, a z/x/y template, or a self-hosted path", () => {
    expect(style.sources[SOURCE.basemap]).toEqual({ type: "vector", url: "https://tiles.openfreemap.org/planet", maxzoom: 14 })
    const template = createMapStyle({ theme: THEME, basemap: { ...BASEMAP, source: { type: "tiles", tiles: ["https://tiles.example/{z}/{x}/{y}.pbf"] } }, home: null, regions: [], points: pointsToGeoJSON([]) })
    expect(template.sources[SOURCE.basemap]).toMatchObject({ tiles: ["https://tiles.example/{z}/{x}/{y}.pbf"] })
    const selfHosted = createMapStyle({ theme: THEME, basemap: { ...BASEMAP, source: { type: "tilejson", url: "/tiles/planet" } }, origin: "https://glass-ux.example/o/all", home: null, regions: [], points: pointsToGeoJSON([]) })
    expect(selfHosted.sources[SOURCE.basemap]).toMatchObject({ url: "https://glass-ux.example/tiles/planet" })
    expect(style.glyphs).toBe(BASEMAP.glyphs)
  })

  it("draws only OpenMapTiles layers, with every font from the config", () => {
    const OPENMAPTILES = new Set(["water", "waterway", "landcover", "landuse", "park", "transportation", "transportation_name", "building", "boundary", "place", "aeroway", "water_name"])
    const basemapLayers = style.layers.filter((layer) => "source" in layer && layer.source === SOURCE.basemap)
    for (const layer of basemapLayers) expect(OPENMAPTILES.has((layer as { "source-layer": string })["source-layer"])).toBe(true)
    const fonts = new Set(basemapLayers.flatMap((layer) => ((layer as { layout?: { "text-font"?: string[] } }).layout?.["text-font"] ?? [])))
    expect([...fonts].every((font) => Object.values(BASEMAP.fonts).includes(font))).toBe(true)
  })

  it("keeps labels minimal at state zoom: cities first, the rest as you zoom in", () => {
    const minzoom = (id: string) => (style.layers.find((layer) => layer.id === id) as { minzoom?: number }).minzoom ?? 0
    expect(minzoom("labels-cities")).toBeLessThan(minzoom("labels-towns"))
    expect(minzoom("labels-towns")).toBeLessThan(minzoom("labels-villages"))
    expect(minzoom("labels-villages")).toBeLessThan(minzoom("labels-local"))
    expect(minzoom("labels-roads")).toBeGreaterThanOrEqual(13)
  })

  it("clusters the points with per-status counts", () => {
    expect(style.sources[SOURCE.points]).toMatchObject({ type: "geojson", cluster: true, clusterProperties: statusClusterProperties() })
    expect(style.layers.at(-1)?.id).toBe(POINTS_LAYER)
  })

  it("draws the home region as a fill and three stacked glow lines in the theme's glow colour", () => {
    const home = style.layers.filter((layer) => "source" in layer && layer.source === SOURCE.home)
    expect(home.map((layer) => layer.id)).toEqual(["home-fill", "home-glow-wide", "home-glow", "home-core"])
    const paint = (id: string) => (home.find((layer) => layer.id === id) as { paint: Record<string, unknown> }).paint
    expect(paint("home-glow-wide")["line-color"]).toBe(THEME.glow)
    expect(paint("home-core")["line-color"]).toBe(THEME.glowCore)
    expect(paint("home-glow-wide")["line-blur"]).toBeDefined()
  })

  it("reserves every marker's footprint so place names avoid it", () => {
    const anchor = style.layers.find((layer) => layer.id === POINTS_LAYER) as { type: string; layout: Record<string, unknown>; paint: Record<string, unknown> }
    expect(anchor.type).toBe("symbol")
    // Placed first (the top layer), always placed, and in everyone else's way.
    expect(style.layers.at(-1)).toBe(anchor)
    expect(anchor.layout).toMatchObject({ "icon-allow-overlap": true, "icon-ignore-placement": false, "text-allow-overlap": true, "text-ignore-placement": false })
    expect(anchor.paint).toEqual({ "icon-opacity": 0, "text-opacity": 0 })
    // Place names give way: no overlap allowed, and other sides to try.
    for (const id of ["labels-cities", "labels-towns", "labels-villages", "labels-local"]) {
      const layout = (style.layers.find((layer) => layer.id === id) as { layout: Record<string, unknown> }).layout
      expect(layout["text-allow-overlap"]).toBeUndefined()
      expect(layout["text-variable-anchor"]).toContain("top")
    }
    // Without glyphs (no basemap) the footprint is the icon alone.
    const bare = createMapStyle({ theme: THEME, basemap: null, home: null, regions: [], points: pointsToGeoJSON([]) })
    expect((bare.layers.at(-1) as { layout: Record<string, unknown> }).layout["text-field"]).toBeUndefined()
    expect(pointsToGeoJSON([{ id: "a", lng: 1, lat: 2, status: "healthy", label: "Central studio" }]).features[0]!.properties).toEqual({ id: "a", status: "healthy", label: "Central studio" })
  })

  it("keeps labels above the glow and the ground below it", () => {
    const ids = style.layers.map((layer) => layer.id)
    expect(ids.indexOf("water")).toBeLessThan(ids.indexOf("home-fill"))
    expect(ids.indexOf("roads-motorway")).toBeLessThan(ids.indexOf("home-glow-wide"))
    expect(ids.indexOf("labels-cities")).toBeGreaterThan(ids.indexOf("home-core"))
  })

  it("fades the basemap in by zoom and gives a light canvas more ink", () => {
    const opacity = (theme: MapTheme) =>
      ((createMapStyle({ theme, basemap: BASEMAP, home: null, regions: [], points: pointsToGeoJSON([]) }).layers.find((layer) => layer.id === "roads-primary") as { paint: Record<string, unknown> }).paint["line-opacity"] as unknown[]).slice(3) as number[]
    const dark = opacity(THEME)
    const light = opacity({ ...THEME, mode: "light" })
    expect(dark[1]).toBe(0) // invisible at the first stop
    expect(light[3]!).toBeGreaterThan(dark[3]!)
  })

  it("recolours from the theme alone (a palette change is paint, not data)", () => {
    const recoloured = createMapStyle({ theme: { ...THEME, glow: "rgba(1, 2, 3, 1)" }, basemap: BASEMAP, origin: "https://glass-ux.example/o/all", home: TASMANIA, regions: [], points: pointsToGeoJSON(SITES) })
    expect(recoloured.sources).toEqual(style.sources)
    expect(JSON.stringify(recoloured.layers)).not.toEqual(JSON.stringify(style.layers))
  })

  it("builds zoom ramps", () => {
    expect(byZoom([[5, 0], [8, 1]])).toEqual(["interpolate", ["linear"], ["zoom"], 5, 0, 8, 1])
  })
})

/* ── Projection, regions and keyboard ───────────────────────────────────────── */

describe("projection", () => {
  it("projects Web Mercator into unit space", () => {
    expect(projectX(-180)).toBe(0)
    expect(projectX(180)).toBe(1)
    expect(projectY(0)).toBeCloseTo(0.5)
    expect(unprojectY(projectY(-42.88))).toBeCloseTo(-42.88)
  })

  it("frames a box as an SVG viewBox and draws rings as a path", () => {
    expect(viewBoxOf([-180, -85.051129, 180, 85.051129]).split(" ").map((n) => Math.round(Number(n)) + 0)).toEqual([0, 0, 10000, 10000])
    const path = ringsToPath(ringsOf(TASMANIA.geometry))
    expect(path.startsWith("M")).toBe(true)
    expect(path.endsWith("Z")).toBe(true)
  })

  it("pads a single point's box and handles the antimeridian", () => {
    const box = boxOfPoints([{ lng: 147, lat: -42 }], 0.2)!
    expect(box[2] - box[0]).toBeCloseTo(0.2)
    expect(boxOfPoints([])).toBeNull()
    expect(boxContains([170, -50, -170, -30], 179, -40)).toBe(true)
    expect(boxContains([170, -50, -170, -30], 0, -40)).toBe(false)
  })

  it("treats a region the build did not produce as no outline, never an error", async () => {
    const responses: Record<string, Response> = {
      "/geo/admin1/XX/XX-ZZ.json": new Response("Not found", { status: 404 }),
      // A dev server that answers unknown paths with the app's HTML.
      "/geo/admin1/YY/YY-ZZ.json": new Response("<!doctype html><title>Glass UX</title>", { status: 200, headers: { "content-type": "text/html" } }),
    }
    vi.stubGlobal("fetch", (url: string) => (url in responses ? Promise.resolve(responses[url]!) : Promise.reject(new TypeError("offline"))))
    await expect(loadRegion("/geo/admin1/{country}/{code}.json", "XX-ZZ")).resolves.toBeNull()
    await expect(loadRegion("/geo/admin1/{country}/{code}.json", "YY-ZZ")).resolves.toBeNull()
    await expect(loadRegion("/geo/admin1/{country}/{code}.json", "ZZ-ZZ")).resolves.toBeNull()
  })

  it("builds region URLs from the template", () => {
    expect(regionUrl("/geo/admin1/{country}/{code}.json", "AU-TAS")).toBe("/geo/admin1/AU/AU-TAS.json")
    expect(regionUrl("/geo/admin1/{country}/{code}.json", "AU-X02~")).toBe("/geo/admin1/AU/AU-X02.json")
  })
})

describe("marker keyboard", () => {
  const points = [
    { x: 100, y: 100 },
    { x: 200, y: 110 },
    { x: 110, y: 220 },
    { x: 40, y: 90 },
  ]
  it("moves to the nearest marker in the arrow's direction", () => {
    expect(nextMarker(points, 0, "ArrowRight")).toBe(1)
    expect(nextMarker(points, 0, "ArrowDown")).toBe(2)
    expect(nextMarker(points, 0, "ArrowLeft")).toBe(3)
    expect(nextMarker(points, 0, "ArrowUp")).toBeNull()
  })
  it("goes to the first and last in reading order", () => {
    expect(readingOrder(points)).toEqual([3, 0, 2, 1])
    expect(nextMarker(points, 1, "Home")).toBe(3)
    expect(nextMarker(points, 3, "End")).toBe(1)
  })
})

describe("describeCounts in a locale", () => {
  it("joins with the locale's list separator", () => {
    const labels = { danger: "d", warning: "w", healthy: "h", unknown: "u" }
    const counts = { danger: 1, warning: 2, healthy: 3, unknown: 0 }
    expect(describeCounts(counts, labels, "en")).toBe("1 d, 2 w, 3 h")
    expect(describeCounts(counts, labels, "ar")).toContain("،")
  })

  it("writes the counts as the locale does", () => {
    const labels = { danger: "d", warning: "w", healthy: "h", unknown: "u" }
    expect(describeCounts({ danger: 0, warning: 0, healthy: 1234, unknown: 0 }, labels, "en")).toBe("1,234 h")
    expect(describeCounts({ danger: 0, warning: 0, healthy: 1234, unknown: 0 }, labels, "de")).toBe("1.234 h")
    expect(describeCounts({ danger: 0, warning: 0, healthy: 12, unknown: 0 }, labels, "ar-EG")).toBe("١٢ h")
  })
})

