import { describe, expect, it } from "vitest"
import { areasToGeoJSON, circlePolygon, clampRadius, destination, distanceMetres } from "./area.js"
import { createMapStyle, SOURCE, type MapTheme } from "./style.js"

const HOBART = { lng: 147.3257, lat: -42.8826 }

describe("areas around points", () => {
  it("puts a destination the given distance away, in the given direction", () => {
    for (const metres of [25, 200, 5_000]) {
      for (const bearing of [0, 90, 180, 270]) {
        const point = destination(HOBART, metres, bearing)
        expect(distanceMetres(HOBART, point)).toBeCloseTo(metres, 6)
      }
    }
    expect(destination(HOBART, 1_000, 90).lng).toBeGreaterThan(HOBART.lng)
    expect(destination(HOBART, 1_000, 0).lat).toBeGreaterThan(HOBART.lat)
  })

  it("draws a closed circle whose every vertex is the radius from the centre", () => {
    const circle = circlePolygon(HOBART, 200, { id: "site" })
    const ring = circle.geometry.coordinates[0]!
    expect(ring[0]).toEqual(ring.at(-1))
    for (const [lng, lat] of ring) expect(distanceMetres(HOBART, { lng: lng!, lat: lat! })).toBeCloseTo(200, 6)
    expect(circle.properties).toEqual({ id: "site" })
  })

  it("draws circles only for points with a positive radius", () => {
    const areas = areasToGeoJSON([
      { id: "a", ...HOBART, radius: 200 },
      { id: "b", ...HOBART },
      { id: "c", ...HOBART, radius: 0 },
      { id: "d", ...HOBART, radius: Number.NaN },
    ])
    expect(areas.features.map((feature) => feature.properties?.id)).toEqual(["a"])
    expect(areasToGeoJSON([]).features).toEqual([])
  })

  it("holds a radius to its limits and step", () => {
    expect(clampRadius(203, 25, 5_000, 25)).toBe(200)
    expect(clampRadius(213, 25, 5_000, 25)).toBe(225)
    expect(clampRadius(3, 25, 5_000, 25)).toBe(25)
    expect(clampRadius(9_000, 25, 5_000, 25)).toBe(5_000)
    expect(clampRadius(37, 10, 10_000, 5)).toBe(35)
  })

  it("carries the areas in the style, under the labels", () => {
    const theme = { mode: "light", area: "rgba(0, 0, 255, 1)" } as MapTheme
    const areas = areasToGeoJSON([{ id: "a", ...HOBART, radius: 200 }])
    const style = createMapStyle({ theme, basemap: null, home: null, regions: [], points: { type: "FeatureCollection", features: [] }, areas })
    expect((style.sources[SOURCE.areas] as { data: unknown }).data).toBe(areas)
    const ids = style.layers.map((layer) => layer.id)
    expect(ids).toEqual(expect.arrayContaining(["areas-fill", "areas-line"]))
    expect(ids.indexOf("areas-line")).toBeLessThan(ids.length - 1)
  })
})

describe("framing with areas", () => {
  it("adds each area's four edges, and leaves points without one alone", async () => {
    const { withAreaEdges } = await import("./area.js")
    const plain = [{ ...HOBART }]
    expect(withAreaEdges(plain)).toBe(plain)
    const edges = withAreaEdges([{ ...HOBART, radius: 1_000 }, { lng: 147, lat: -42 }])
    expect(edges).toHaveLength(6)
    for (const edge of edges.slice(1, 5)) expect(distanceMetres(HOBART, edge)).toBeCloseTo(1_000, 6)
  })
})
