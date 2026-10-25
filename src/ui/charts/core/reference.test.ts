import { describe, expect, it } from "vitest"
import { placeLineLabels, placeMarkerLabels, resolveBands, statusThresholds, toneOf } from "./reference.js"

describe("status thresholds and bands", () => {
  const thresholds = [
    { value: 95, tone: "danger" as const, label: "Critical" },
    { value: 50, label: "Target" },
    { value: 80, tone: "warning" as const, label: "Warning" },
  ]

  it("keeps only the status thresholds, lowest first", () => {
    expect(statusThresholds(thresholds).map((t) => t.value)).toEqual([80, 95])
  })

  it("shades each status threshold up to the next, or to the top", () => {
    expect(resolveBands(thresholds, undefined, 100)).toEqual([
      { from: 80, to: 95, tone: "warning" },
      { from: 95, to: 100, tone: "danger" },
    ])
  })

  it("draws the caller's bands instead, ends in order", () => {
    expect(resolveBands(thresholds, [{ from: 60, to: 20, label: "Normal" }], 100)).toEqual([{ from: 20, to: 60, label: "Normal" }])
    expect(resolveBands(thresholds, [], 100)).toEqual([])
  })

  it("finds the tone a value is in", () => {
    const status = statusThresholds(thresholds)
    expect(toneOf(status, 40)).toBeUndefined()
    expect(toneOf(status, 80)).toBe("warning")
    expect(toneOf(status, 97)).toBe("danger")
    expect(toneOf(status, null)).toBeUndefined()
  })
})

describe("placeLineLabels", () => {
  const base = { top: 0, bottom: 200, lineHeight: 16, gap: 3 }

  it("puts a label below its line", () => {
    expect(placeLineLabels([{ key: "a", y: 50 }], base)).toEqual([{ key: "a", top: 53, side: "below" }])
  })

  it("moves a label above when below would leave the plot", () => {
    expect(placeLineLabels([{ key: "a", y: 195 }], base)).toEqual([{ key: "a", top: 176, side: "above" }])
  })

  it("keeps two close lines' labels apart", () => {
    const placed = placeLineLabels(
      [
        { key: "b", y: 60 },
        { key: "a", y: 50 },
      ],
      base
    )
    expect(placed).toEqual([
      { key: "a", top: 31, side: "above" },
      { key: "b", top: 63, side: "below" },
    ])
  })

  it("prefers the side clear of the latest point", () => {
    expect(placeLineLabels([{ key: "a", y: 50 }], { ...base, avoid: [62], avoidRadius: 8 })).toEqual([{ key: "a", top: 31, side: "above" }])
  })

  it("leaves out a label that fits nowhere", () => {
    expect(placeLineLabels([{ key: "a", y: 10 }], { ...base, top: 0, bottom: 20 })).toEqual([])
  })
})

describe("placeMarkerLabels", () => {
  it("places labels after their rules and flips the last before it near the end", () => {
    const placed = placeMarkerLabels(
      [
        { key: "a", x: 10, width: 40 },
        { key: "b", x: 190, width: 40 },
      ],
      0,
      200,
      4
    )
    expect(placed.map((p) => [p.key, p.anchor, p.x])).toEqual([
      ["a", "start", 14],
      ["b", "end", 186],
    ])
  })

  it("drops a label that would overlap the one before it, and markers outside the plot", () => {
    const placed = placeMarkerLabels(
      [
        { key: "a", x: 10, width: 60 },
        { key: "b", x: 30, width: 60 },
        { key: "c", x: 400, width: 10 },
      ],
      0,
      200,
      4
    )
    expect(placed.map((p) => p.key)).toEqual(["a"])
  })
})
