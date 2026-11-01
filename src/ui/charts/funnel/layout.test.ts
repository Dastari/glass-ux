import { describe, expect, it } from "vitest"
import { funnelBars, funnelConnector, funnelRates } from "./layout.js"

describe("funnelRates", () => {
  it("measures each stage against the first and the one before", () => {
    expect(funnelRates([1000, 500, 100])).toEqual([
      { ofFirst: 1, ofPrevious: null, drop: null },
      { ofFirst: 0.5, ofPrevious: 0.5, drop: 500 },
      { ofFirst: 0.1, ofPrevious: 0.2, drop: 400 },
    ])
  })

  it("has no rate from an empty stage, and reads a stage that grew as a negative drop", () => {
    expect(funnelRates([0, 10])[1]).toEqual({ ofFirst: null, ofPrevious: null, drop: -10 })
    expect(funnelRates([10, 0, 5])[2]).toEqual({ ofFirst: 0.5, ofPrevious: null, drop: -5 })
    expect(funnelRates([10, 15])[1]!.ofPrevious).toBe(1.5)
  })

  it("counts negative values as zero", () => {
    expect(funnelRates([10, -5])[1]).toEqual({ ofFirst: 0, ofPrevious: 0, drop: 10 })
  })
})

describe("funnelBars", () => {
  const options = { x0: 100, x1: 300, top: 0, pitch: 40, thick: 20, offset: 10, align: "centre" as const }

  it("centres bars on the track, to scale with the largest", () => {
    const [a, b] = funnelBars([100, 50], options)
    expect(a).toEqual({ x: 100, y: 10, width: 200, height: 20 })
    expect(b).toEqual({ x: 150, y: 50, width: 100, height: 20 })
  })

  it("lines bars up at the edge", () => {
    expect(funnelBars([100, 50], { ...options, align: "start" }).map((bar) => bar.x)).toEqual([100, 100])
  })

  it("keeps a stage with a value visible, and gives an empty stage no width", () => {
    const [, tiny, none] = funnelBars([100000, 1, 0], options)
    expect(tiny!.width).toBe(2)
    expect(none!.width).toBe(0)
  })

  it("scales to the largest stage when a later one grew", () => {
    const [a, b] = funnelBars([50, 100], options)
    expect(a!.width).toBe(100)
    expect(b!.width).toBe(200)
  })

  it("survives all-zero stages", () => {
    expect(funnelBars([0, 0], options).map((bar) => bar.width)).toEqual([0, 0])
  })
})

describe("funnelConnector", () => {
  it("joins one bar's lower edge to the next bar's upper edge", () => {
    expect(funnelConnector({ x: 0, y: 0, width: 100, height: 10 }, { x: 25, y: 30, width: 50, height: 10 })).toBe("M0,10L100,10L75,30L25,30Z")
  })

  it("draws nothing between touching bars", () => {
    expect(funnelConnector({ x: 0, y: 0, width: 100, height: 10 }, { x: 0, y: 10, width: 100, height: 10 })).toBe("")
  })
})
