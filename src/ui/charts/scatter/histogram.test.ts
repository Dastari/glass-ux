import { describe, expect, it } from "vitest"
import { histogramColumns, histogramSeriesColumns } from "./scatter.js"

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

describe("histogramSeriesColumns", () => {
  it("bins every series over the extent of them all, so they share edges", () => {
    const { edges, counts } = histogramSeriesColumns(
      [
        { key: "a", label: "A", values: [0, 1, 2] },
        { key: "b", label: "B", values: [8, 9, 10] },
      ],
      2,
      undefined,
    )
    expect(edges).toEqual([0, 5, 10])
    expect(counts).toEqual([[3, 0], [0, 3]])
  })

  it("takes its edges from counted bins, and a missing bin counts 0", () => {
    const { edges, counts } = histogramSeriesColumns(
      [
        { key: "a", label: "A", bins: [{ from: 0, to: 1, count: 4 }, { from: 1, to: 2, count: 6 }] },
        { key: "b", label: "B", bins: [{ from: 1, to: 2, count: 2 }] },
      ],
      undefined,
      undefined,
    )
    expect(edges).toEqual([0, 1, 2])
    expect(counts).toEqual([[4, 6], [0, 2]])
  })

  it("bins raw values on another series' counted edges", () => {
    const { counts } = histogramSeriesColumns(
      [
        { key: "a", label: "A", bins: [{ from: 0, to: 5, count: 1 }, { from: 5, to: 10, count: 1 }] },
        { key: "b", label: "B", values: [1, 2, 7] },
      ],
      undefined,
      undefined,
    )
    expect(counts[1]).toEqual([2, 1])
  })

  it("survives no series and no values", () => {
    expect(histogramSeriesColumns([], undefined, undefined).counts).toEqual([])
    expect(histogramSeriesColumns([{ key: "a", label: "A" }], 2, undefined).counts[0]!.every((count) => count === 0)).toBe(true)
  })
})
