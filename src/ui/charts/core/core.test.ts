import { describe, expect, it } from "vitest"
import { spatialNav } from "../treemap/treemap.js"
import { lttbIndices } from "./decimate.js"
import { centreSize, formatBytes, formatRelative, formatShare, formatTick, formatTimeTicks, formatValue } from "./format.js"
import { barPath, segments } from "./geometry.js"
import { linearTicks, nearestIndex, valueDomain } from "./scales.js"
import { slotFor } from "./series.js"
import { chartTier } from "./tier.js"

describe("chartTier (R7.2, the same thresholds as Metric)", () => {
  const presets: Array<[string, number, number, string]> = [
    ["row", 600, 40, "micro"],
    ["header", 360, 56, "micro"],
    ["tile", 280, 180, "compact"],
    ["pane", 720, 480, "full"],
    ["tall-narrow", 240, 640, "compact"],
    ["free", 420, 220, "full"],
  ]
  for (const [name, width, height, tier] of presets) {
    it(`${name} ${width}×${height} → ${tier}`, () => {
      expect(chartTier(width, height)).toBe(tier)
    })
  }
  it("scales with the root font size (the ui-scale knob)", () => {
    expect(chartTier(330, 200, 16)).toBe("full")
    expect(chartTier(330, 200, 20)).toBe("compact")
  })
  it("a narrow column is micro whatever its height", () => {
    expect(chartTier(150, 900)).toBe("micro")
  })
})

describe("format", () => {
  it("units: % sticks, others take a space", () => {
    expect(formatValue(34, { unit: "%" })).toBe("34%")
    expect(formatValue(7.84, { unit: "GB" })).toBe("7.8\u2009GB")
    expect(formatValue(null, { unit: "%" })).toBe("—")
  })
  it("bytes in binary multiples, as Windows reports them", () => {
    expect(formatBytes(1843 * 1024 * 1024)).toBe("1.8\u2009GB")
    expect(formatBytes(640 * 1024 * 1024)).toBe("640\u2009MB")
    expect(formatBytes(512)).toBe("512\u2009B")
    expect(formatBytes(2 * 1024 ** 4)).toBe("2\u2009TB")
  })
  it("ticks share one precision", () => {
    expect(formatTick(5, 2.5)).toBe("5.0")
    expect(formatTick(2.5, 2.5)).toBe("2.5")
    expect(formatTick(200, 50)).toBe("200")
    expect(formatTick(40, 20, { unit: "%" })).toBe("40%")
    expect(formatTick(12_000, 2000)).toBe("12K")
  })
  it("time ticks: clock within a day, the date where the day turns", () => {
    const at = (h: number, d = 13) => new Date(2026, 9, d, h, 0)
    expect(formatTimeTicks([at(10), at(12), at(14)])).toEqual(["10:00", "12:00", "14:00"])
    expect(formatTimeTicks([at(20), at(22), at(0, 14), at(2, 14)])).toEqual(["20:00", "22:00", "14 Oct", "02:00"])
    expect(formatTimeTicks([new Date(2026, 9, 11), new Date(2026, 9, 12), new Date(2026, 9, 13)])).toEqual(["11 Oct", "12 Oct", "13 Oct"])
  })
  it("relative time for recent moments", () => {
    const now = new Date(2026, 9, 13, 11, 0)
    expect(formatRelative(new Date(2026, 9, 13, 10, 58), now)).toBe("2 min ago")
    expect(formatRelative(new Date(2026, 9, 13, 8, 0), now)).toBe("3 h ago")
    expect(formatRelative(new Date(2026, 9, 12, 11, 0), now)).toBe("1 day ago")
    expect(formatRelative(now, now)).toBe("now")
  })
  it("shares", () => {
    expect(formatShare(112, 137)).toBe("82%")
    expect(formatShare(8, 137)).toBe("5.8%")
    expect(formatShare(0.01, 137)).toBe("<0.1%")
  })
  it("centre value roles by ring size", () => {
    expect(centreSize(120, 16)).toBe("lg")
    expect(centreSize(64, 16)).toBe("md")
    expect(centreSize(44, 16)).toBe("sm")
    expect(centreSize(20, 16)).toBe("xs")
  })
})

describe("scales", () => {
  it("anchors positive data at zero and rounds to nice ticks", () => {
    expect(valueDomain([12, 47, 33])).toEqual([0, 50])
    expect(valueDomain([12, 47], [0, 100])).toEqual([0, 100])
    expect(valueDomain([62, 64], undefined, { zero: false })[0]).toBeGreaterThan(0)
  })
  it("tick count follows the box", () => {
    expect(linearTicks([0, 100], 400).values.length).toBeGreaterThan(linearTicks([0, 100], 120).values.length)
  })
  it("nearest index by value", () => {
    expect(nearestIndex([0, 10, 20, 30], 14)).toBe(1)
    expect(nearestIndex([0, 10, 20, 30], 16)).toBe(2)
    expect(nearestIndex([0, 10, 20, 30], 99)).toBe(3)
  })
})

describe("series slots", () => {
  it("assign in order, keep pinned slots, never cycle past eight", () => {
    expect([0, 1, 2].map((i) => slotFor(i))).toEqual([1, 2, 3])
    expect(slotFor(0, 5)).toBe(5)
    expect(slotFor(11)).toBe(8)
  })
})

describe("decimation (LTTB)", () => {
  const xs = Array.from({ length: 5000 }, (_, i) => i)
  const ys = xs.map((i) => (i === 2717 ? 100 : Math.sin(i / 50) * 10))
  it("keeps the ends, the requested count and the peaks", () => {
    const kept = lttbIndices(xs, ys, 400)
    expect(kept).toHaveLength(400)
    expect(kept[0]).toBe(0)
    expect(kept[kept.length - 1]).toBe(4999)
    expect(kept).toContain(2717)
    expect(kept.toSorted((a, b) => a - b)).toEqual(kept)
  })
  it("leaves short series alone", () => {
    expect(lttbIndices([0, 1, 2], [1, 2, 3], 10)).toEqual([0, 1, 2])
  })
})

describe("geometry", () => {
  it("a missing sample breaks the line", () => {
    const runs = segments([{ y: 1 }, { y: 2 }, { y: null }, { y: 3 }])
    expect(runs.map((run) => run.length)).toEqual([2, 1])
  })
  it("a bar keeps one command structure from zero to full, so it can morph", () => {
    const shape = (d: string) => d.replace(/[-\d.]+/g, "#")
    expect(shape(barPath(0, 100, 20, 0, 4))).toBe(shape(barPath(0, 20, 20, 80, 4)))
    expect(shape(barPath(0, 0, 0, 12, 4, "right"))).toBe(shape(barPath(0, 0, 90, 12, 4, "right")))
  })
  it("rounds only the data end", () => {
    expect(barPath(0, 0, 20, 50, 4, "top")).toMatch(/^M0,50V4Q0,0 4,0H16Q20,0 20,4V50Z$/)
  })
})

describe("treemap keyboard: spatial navigation", () => {
  // ┌────────┬────┐
  // │   A    │ B  │
  // │        ├────┤
  // │        │ C  │
  // └────────┴────┘
  const rects = [
    { x0: 0, y0: 0, x1: 60, y1: 100 },
    { x0: 62, y0: 0, x1: 100, y1: 40 },
    { x0: 62, y0: 42, x1: 100, y1: 100 },
  ]
  it("moves by direction to the nearest tile", () => {
    expect(spatialNav(rects, 0, "ArrowRight")).toBe(2)
    expect(spatialNav(rects, 2, "ArrowUp")).toBe(1)
    expect(spatialNav(rects, 1, "ArrowDown")).toBe(2)
    expect(spatialNav(rects, 1, "ArrowLeft")).toBe(0)
    expect(spatialNav(rects, 0, "ArrowLeft")).toBeNull()
    expect(spatialNav(rects, 2, "Home")).toBe(0)
  })
})

describe("whole-number counts", () => {
  it("keeps ticks whole when the values are counts", async () => {
    const { allIntegers } = await import("./scales.js")
    expect(allIntegers([0, 1, 0, null, 1])).toBe(true)
    expect(allIntegers([0, 1.5])).toBe(false)
    expect(allIntegers([null])).toBe(false)
    expect(linearTicks([0, 1], 200, 40, { integer: true })).toEqual({ values: [0, 1], step: 1 })
    expect(linearTicks([0, 3], 300, 40, { integer: true }).values).toEqual([0, 1, 2, 3])
    // Larger domains keep their nice steps.
    expect(linearTicks([0, 40], 200, 40, { integer: true }).step).toBeGreaterThanOrEqual(10)
    expect(linearTicks([0, 1], 200, 40).values.some((value) => !Number.isInteger(value))).toBe(true)
  })

  it("writes a counted unit in the singular for exactly one", async () => {
    const alerts = { unit: { one: "alert", other: "alerts" } }
    // Numbers and units are joined by a thin space (R2.7).
    const plain = (text: string) => text.replace(/\s/g, " ")
    expect(plain(formatTick(1, 1, alerts))).toBe("1 alert")
    expect(plain(formatTick(2, 1, alerts))).toBe("2 alerts")
    expect(plain(formatTick(0, 1, alerts))).toBe("0 alerts")
    expect(plain(formatValue(1, alerts))).toBe("1 alert")
    expect(plain(formatValue(1.5, alerts))).toBe("1.5 alerts")
    expect(plain(formatTick(1, 1, { unit: "alerts" }))).toBe("1 alerts")
  })
})
