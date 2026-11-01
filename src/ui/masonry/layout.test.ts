import { describe, expect, it } from "vitest"
import { layoutMasonry, masonryColumns } from "./layout.js"

const options = { width: 500, gap: 10, minColumnWidth: 150 }
/** A deterministic spread of heights, so the same run always checks the same list. */
const heights = (count: number) => Array.from({ length: count }, (_, index) => 40 + ((index * 37 + 11) % 90))

describe("masonryColumns", () => {
  it("fits as many columns as the narrowest width allows, counting the gaps", () => {
    expect(masonryColumns(options)).toBe(3)
    expect(masonryColumns({ ...options, width: 469 })).toBe(2)
    expect(masonryColumns({ ...options, width: 100 })).toBe(1)
    expect(masonryColumns({ ...options, width: 0 })).toBe(0)
  })

  it("takes a fixed count over the width, within the most allowed", () => {
    expect(masonryColumns({ ...options, columns: 4 })).toBe(4)
    expect(masonryColumns({ ...options, columns: 4, maxColumns: 2 })).toBe(2)
    expect(masonryColumns({ ...options, width: 1500, maxColumns: 4 })).toBe(4)
    expect(masonryColumns({ ...options, columns: 0 })).toBe(1)
  })
})

describe("layoutMasonry", () => {
  it("shares the width between the columns and the gaps", () => {
    const layout = layoutMasonry(3, options, () => 100)
    expect(layout.columns).toBe(3)
    expect(layout.columnWidth).toBeCloseTo((500 - 20) / 3)
    expect(layout.placements.map((place) => place.x)).toEqual([0, layout.columnWidth + 10, 2 * (layout.columnWidth + 10)])
    expect(layout.height).toBe(100)
  })

  it("puts each item in the shortest column, the first of equal ones", () => {
    const given = [100, 50, 80, 30, 30, 30]
    const layout = layoutMasonry(6, options, (index) => given[index]!)
    // Columns end at 100, 50, 80: the fourth goes to column 1 (50), then 80 (col 1 at 90? no: 50 + 10 + 30 = 90).
    expect(layout.placements.map((place) => place.column)).toEqual([0, 1, 2, 1, 2, 1])
    expect(layout.placements.map((place) => place.y)).toEqual([0, 0, 0, 60, 90, 100])
  })

  it("keeps the order of the items the order of reading: tops never rise, and a tie goes to the reading start", () => {
    for (const columns of [2, 3, 5, 8]) {
      const given = heights(120)
      const { placements } = layoutMasonry(120, { width: 1000, gap: 12, minColumnWidth: 10, columns }, (index) => given[index]!)
      for (let index = 1; index < placements.length; index++) {
        const [before, now] = [placements[index - 1]!, placements[index]!]
        expect(now.y).toBeGreaterThanOrEqual(before.y)
        if (now.y === before.y) expect(now.column).toBeGreaterThan(before.column)
      }
    }
  })

  it("never moves an earlier item when items are appended", () => {
    const given = heights(60)
    const few = layoutMasonry(30, options, (index) => given[index]!)
    const more = layoutMasonry(60, options, (index) => given[index]!)
    expect(more.placements.slice(0, 30)).toEqual(few.placements)
    expect(more.height).toBeGreaterThan(few.height)
  })

  it("keeps items inside the box and apart by the gap", () => {
    const given = heights(40)
    const layout = layoutMasonry(40, options, (index) => given[index]!)
    const last = new Map<number, number>()
    for (const place of layout.placements) {
      expect(place.x + place.width).toBeLessThanOrEqual(500 + 1e-9)
      const above = last.get(place.column)
      if (above !== undefined) expect(place.y - above).toBeCloseTo(10)
      last.set(place.column, place.y + place.height)
    }
    expect(layout.height).toBeCloseTo(Math.max(...last.values()))
  })

  it("gives each item its height at the column's width", () => {
    const layout = layoutMasonry(2, { width: 210, gap: 10, minColumnWidth: 100 }, (_, width) => width / 2)
    expect(layout.columnWidth).toBe(100)
    expect(layout.placements.map((place) => place.height)).toEqual([50, 50])
  })

  it("lays nothing out without a width, and handles no items", () => {
    expect(layoutMasonry(5, { ...options, width: 0 }, () => 10)).toEqual({ columns: 0, columnWidth: 0, placements: [], height: 0 })
    expect(layoutMasonry(0, options, () => 10).height).toBe(0)
  })
})
