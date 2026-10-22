import { describe, expect, it } from "vitest"
import { parseAspectRatio } from "./aspect-ratio.js"

describe("parseAspectRatio", () => {
  it("reads numbers and w / h strings", () => {
    expect(parseAspectRatio(16 / 9)).toBeCloseTo(16 / 9)
    expect(parseAspectRatio("2560 / 1440")).toBeCloseTo(16 / 9)
    expect(parseAspectRatio("4/3")).toBeCloseTo(4 / 3)
    expect(parseAspectRatio("1.5")).toBe(1.5)
  })
  it("falls back to 1 for missing, zero, negative or unreadable ratios", () => {
    for (const ratio of [undefined, 0, -2, Number.NaN, Infinity, "", "wide", "16 / 0", "0 / 9", "1 / 2 / 3", "/ 9"]) {
      expect(parseAspectRatio(ratio)).toBe(1)
    }
  })
})
