import { describe, expect, it } from "vitest"
import { fitItems } from "./overflow.js"

const widths = [100, 100, 100, 100, 100]

describe("fitItems", () => {
  it("keeps everything when it all fits", () => {
    expect(fitItems({ widths, available: 540, gap: 10, moreWidth: 60, keep: 0 })).toEqual([0, 1, 2, 3, 4])
  })

  it("keeps the longest prefix that fits beside the trigger", () => {
    // 3 items (330 incl. gaps) + trigger 60 = 390 ≤ 400
    expect(fitItems({ widths, available: 400, gap: 10, moreWidth: 60, keep: 0 })).toEqual([0, 1, 2])
  })

  it("swaps the kept item in at the end of the prefix", () => {
    expect(fitItems({ widths, available: 400, gap: 10, moreWidth: 60, keep: 4 })).toEqual([0, 1, 4])
  })

  it("never hides the kept item, even when nothing else fits", () => {
    expect(fitItems({ widths, available: 80, gap: 10, moreWidth: 60, keep: 3 })).toEqual([3])
  })

  it("works without a kept item", () => {
    expect(fitItems({ widths, available: 290, gap: 10, moreWidth: 60, keep: -1 })).toEqual([0, 1])
  })

  it("respects uneven widths without reordering", () => {
    expect(fitItems({ widths: [80, 200, 60, 90], available: 300, gap: 0, moreWidth: 50, keep: 2 })).toEqual([0, 2])
  })
})
