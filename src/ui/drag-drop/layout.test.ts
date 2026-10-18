import { describe, expect, it } from "vitest"
import { applyDrop, arrange, gridColumns, insertionIndex, keyboardStep, moveItem, type Box } from "./layout.js"

const column = (count: number, h = 40, gap = 8): Box[] => Array.from({ length: count }, (_, index) => ({ x: 0, y: index * (h + gap), w: 200, h }))
const base = { gap: 8, rowGap: 8, origin: { x: 0, y: 0 }, size: { w: 200, h: 40 } }

describe("arrange (lists)", () => {
  it("closes the gap when the carried item leaves its list", () => {
    const { shifts, slot } = arrange({ sort: "vertical", boxes: column(4), removed: 1, insert: null, ...base })
    expect(shifts.map((shift) => shift.y)).toEqual([0, 0, -48, -48])
    expect(slot).toBeNull()
  })

  it("opens a gap of the carried item's size where it would land", () => {
    const { shifts, slot } = arrange({ sort: "vertical", boxes: column(3), removed: null, insert: 1, ...base, size: { w: 200, h: 60 } })
    expect(shifts.map((shift) => shift.y)).toEqual([0, 68, 68])
    expect(slot).toEqual({ x: 0, y: 48, w: 200, h: 60 })
  })

  it("moves the gap within its own list", () => {
    const { shifts, slot } = arrange({ sort: "vertical", boxes: column(4), removed: 0, insert: 2, ...base })
    expect(shifts.map((shift) => shift.y)).toEqual([0, -48, -48, 0])
    expect(slot?.y).toBe(96)
  })

  it("leaves everything in place when the item is over its own slot", () => {
    const { shifts, slot } = arrange({ sort: "vertical", boxes: column(3), removed: 1, insert: 1, ...base })
    expect(shifts.every((shift) => shift.x === 0 && shift.y === 0)).toBe(true)
    expect(slot?.y).toBe(48)
  })

  it("places the slot at the content start of an empty list", () => {
    const { slot } = arrange({ sort: "horizontal", boxes: [], removed: null, insert: 0, ...base, origin: { x: 12, y: 6 } })
    expect(slot).toEqual({ x: 12, y: 6, w: 200, h: 40 })
  })
})

describe("arrange (grids)", () => {
  const grid: Box[] = Array.from({ length: 5 }, (_, index) => ({ x: (index % 3) * 110, y: Math.floor(index / 3) * 110, w: 100, h: 100 }))

  it("counts columns from the first row", () => {
    expect(gridColumns(grid)).toBe(3)
  })

  it("moves items into the cells of their new positions", () => {
    const { shifts, slot } = arrange({ sort: "grid", boxes: grid, removed: 4, insert: 0, ...base, size: { w: 100, h: 100 } })
    expect(slot).toEqual(grid[0])
    expect(shifts[0]).toEqual({ x: 110, y: 0 })
    expect(shifts[2]).toEqual({ x: -220, y: 110 })
  })

  it("extrapolates a cell past the last item", () => {
    const { slot } = arrange({ sort: "grid", boxes: grid, removed: null, insert: 5, ...base, size: { w: 100, h: 100 } })
    expect(slot).toEqual({ x: 220, y: 110, w: 100, h: 100 })
  })
})

describe("insertionIndex", () => {
  it("passes a neighbour once the centre crosses its midpoint", () => {
    const boxes = column(3)
    expect(insertionIndex("vertical", boxes, null, { x: 100, y: 10 }, base)).toBe(0)
    expect(insertionIndex("vertical", boxes, null, { x: 100, y: 30 }, base)).toBe(1)
    expect(insertionIndex("vertical", boxes, null, { x: 100, y: 500 }, base)).toBe(3)
  })

  it("measures the remaining items with the gap closed", () => {
    // Item 0 removed: item 1 now sits at 0–40, so 30 is past its midpoint.
    expect(insertionIndex("vertical", column(3), 0, { x: 100, y: 30 }, base)).toBe(1)
    expect(insertionIndex("vertical", column(3), 0, { x: 100, y: 10 }, base)).toBe(0)
  })
})

describe("keyboardStep", () => {
  it("moves along a list and leaves it across its axis", () => {
    expect(keyboardStep("vertical", "ArrowDown", 1, 3)).toBe(2)
    expect(keyboardStep("vertical", "ArrowDown", 3, 3)).toBe(3)
    expect(keyboardStep("vertical", "ArrowRight", 1, 3)).toBe("next")
    expect(keyboardStep("horizontal", "ArrowUp", 1, 3)).toBe("previous")
    expect(keyboardStep("horizontal", "ArrowLeft", 1, 3, 1, true)).toBe(2)
  })

  it("moves by rows in a grid and leaves it past its edges", () => {
    expect(keyboardStep("grid", "ArrowDown", 1, 7, 3)).toBe(4)
    expect(keyboardStep("grid", "ArrowUp", 1, 7, 3)).toBe("previous")
    expect(keyboardStep("grid", "ArrowDown", 6, 7, 3)).toBe(7)
    expect(keyboardStep("grid", "ArrowDown", 7, 7, 3)).toBe("next")
  })

  it("visits zones in order from a zone that does not sort", () => {
    expect(keyboardStep(null, "ArrowDown", 0, 0)).toBe("next")
    expect(keyboardStep(null, "ArrowLeft", 0, 0)).toBe("previous")
  })
})

describe("applying drops", () => {
  const key = (item: { id: string }) => item.id
  const lists = { todo: [{ id: "a" }, { id: "b" }, { id: "c" }], done: [{ id: "d" }] }

  it("reorders within a list", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"])
    const next = applyDrop(lists, { item: { id: "a", data: null }, source: { zoneId: "todo", index: 0 }, target: { zoneId: "todo", index: 2 }, effect: "move" }, key)
    expect(next.todo?.map(key)).toEqual(["b", "c", "a"])
    expect(next.done).toBe(lists.done)
  })

  it("moves between lists", () => {
    const next = applyDrop(lists, { item: { id: "b", data: null }, source: { zoneId: "todo", index: 1 }, target: { zoneId: "done", index: 0 }, effect: "move" }, key)
    expect(next.todo?.map(key)).toEqual(["a", "c"])
    expect(next.done?.map(key)).toEqual(["b", "d"])
  })

  it("copies, and appends to a zone that does not sort", () => {
    const next = applyDrop(lists, { item: { id: "b", data: { id: "b" } }, source: { zoneId: "todo", index: 1 }, target: { zoneId: "done", index: null }, effect: "copy" }, key)
    expect(next.todo).toBe(lists.todo)
    expect(next.done?.map(key)).toEqual(["d", "b"])
  })
})
