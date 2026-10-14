import { describe, expect, it } from "vitest"
import { areaPath, indexAt, monotonePath, resolveDomain, seriesStats, toPoints } from "./geometry.js"

describe("resolveDomain", () => {
  it("keeps an explicit domain", () => {
    expect(resolveDomain([5, 10], [0, 100])).toEqual([0, 100])
  })
  it("pads the data range", () => {
    const [min, max] = resolveDomain([10, 20])
    expect(min).toBeLessThan(10)
    expect(max).toBeGreaterThan(20)
  })
  it("survives a flat series", () => {
    expect(resolveDomain([4, 4, 4])).toEqual([3, 5])
  })
})

describe("toPoints", () => {
  it("maps the domain onto 100…0 (y down)", () => {
    expect(toPoints([0, 50, 100], [0, 100])).toEqual([
      { x: 0, y: 100 },
      { x: 1, y: 50 },
      { x: 2, y: 0 },
    ])
  })
  it("clamps values outside the domain", () => {
    expect(toPoints([-10, 140], [0, 100]).map((p) => p.y)).toEqual([100, 0])
  })
})

describe("monotonePath", () => {
  it("draws a straight segment for two points", () => {
    expect(monotonePath([{ x: 0, y: 10 }, { x: 1, y: 20 }])).toBe("M0,10L1,20")
  })
  it("uses cubic segments and never overshoots a peak", () => {
    const points = toPoints([10, 90, 10, 10], [0, 100])
    const path = monotonePath(points)
    expect(path.startsWith("M0,90C")).toBe(true)
    const ys = [...path.matchAll(/[ C](-?[\d.]+),(-?[\d.]+)/g)].map((m) => Number(m[2]))
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(10 - 1e-9)
    expect(Math.max(...ys)).toBeLessThanOrEqual(90 + 1e-9)
  })
  it("closes the area to the baseline", () => {
    const points = toPoints([1, 2, 3], [0, 4])
    expect(areaPath(monotonePath(points), points).endsWith("L2,100L0,100Z")).toBe(true)
  })
})

describe("stats and hit-testing", () => {
  it("summarises a series", () => {
    expect(seriesStats([10, 20, 30])).toEqual({ min: 10, max: 30, avg: 20, last: 30 })
    expect(seriesStats([])).toBeNull()
  })
  it("snaps to the nearest index", () => {
    expect(indexAt(0, 5)).toBe(0)
    expect(indexAt(0.49, 5)).toBe(2)
    expect(indexAt(1.2, 5)).toBe(4)
  })
})
