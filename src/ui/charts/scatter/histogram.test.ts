import { describe, expect, it } from "vitest"
import { histogramColumns } from "./scatter.js"

describe("histogramColumns", () => {
  it("bins raw values as before", () => {
    expect(histogramColumns([1, 2, 2, 3, 9], 4, undefined)).toEqual({ edges: [1, 2, 4, 6, 8, 9], counts: [1, 3, 0, 0, 1] })
    expect(histogramColumns([1, 2, 2, 3, 9], 2, [0, 10])).toEqual({ edges: [0, 5, 10], counts: [4, 1] })
  })

  it("defaults to about twelve bins and survives no values", () => {
    expect(histogramColumns([], undefined, undefined).counts.every((count) => count === 0)).toBe(true)
    expect(histogramColumns(Array.from({ length: 100 }, (_, index) => index), undefined, undefined).counts).toHaveLength(10)
  })

  it("takes precomputed bins in edge order", () => {
    const bins = [
      { from: 20, to: 30, count: 2 },
      { from: 10, to: 20, count: 5 },
    ]
    expect(histogramColumns(undefined, bins, undefined)).toEqual({ edges: [10, 20, 30], counts: [5, 2] })
    expect(histogramColumns(undefined, [], undefined)).toEqual({ edges: [], counts: [] })
  })
})
