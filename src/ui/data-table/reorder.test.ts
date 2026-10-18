import { describe, expect, it } from "vitest"
import {
  applyMove,
  lineShift,
  moveRow,
  positionText,
  REORDER_REASONS,
  reorderMessages,
  reorderUnavailable,
  slotStart,
  targetFor,
  type LineBox,
} from "./reorder.js"

const ids = (rows: readonly { id: string }[]) => rows.map((row) => row.id).join("")
const rows = ["a", "b", "c", "d", "e"].map((id) => ({ id }))
const idOf = (row: { id: string }) => row.id

describe("moveRow", () => {
  it("moves a row down and up, returning a new array", () => {
    expect(ids(moveRow(rows, 1, 3))).toBe("acdbe")
    expect(ids(moveRow(rows, 4, 0))).toBe("eabcd")
    const same = moveRow(rows, 2, 2)
    expect(same).not.toBe(rows)
    expect(ids(same)).toBe("abcde")
    expect(ids(rows)).toBe("abcde")
  })

  it("returns a copy for out-of-range indexes", () => {
    expect(ids(moveRow(rows, -1, 2))).toBe("abcde")
    expect(ids(moveRow(rows, 1, 9))).toBe("abcde")
  })
})

describe("applyMove", () => {
  it("places the row after its previous neighbour, or before its next one at the start", () => {
    expect(ids(applyMove(rows, idOf, { rowId: "a", previousId: "c", nextId: "d" }))).toBe("bcade")
    expect(ids(applyMove(rows, idOf, { rowId: "d", previousId: null, nextId: "a" }))).toBe("dabce")
  })

  it("returns the same array when the row is already in place or unknown", () => {
    expect(applyMove(rows, idOf, { rowId: "c", previousId: "b", nextId: "d" })).toBe(rows)
    expect(applyMove(rows, idOf, { rowId: "z", previousId: "b", nextId: null })).toBe(rows)
  })

  it("re-applies a pending move to fresh rows that arrived meanwhile", () => {
    const fresh = [...rows, { id: "f" }]
    expect(ids(applyMove(fresh, idOf, { rowId: "e", previousId: "a", nextId: "b" }))).toBe("aebcdf")
  })
})

describe("geometry", () => {
  // Rows 40px tall, except line 2 (expanded) at 80px.
  const sizes = [40, 40, 80, 40, 40]
  const starts = sizes.map((_, index) => sizes.slice(0, index).reduce((sum, size) => sum + size, 0))
  const measure = (index: number): LineBox => ({ start: starts[index] ?? 0, size: sizes[index] ?? 0 })

  it("lands the row at the target's top moving up and its bottom moving down", () => {
    expect(slotStart(3, 1, measure)).toBe(40)
    expect(slotStart(1, 3, measure)).toBe(160 + 40 - 40)
    expect(slotStart(2, 4, measure)).toBe(200 + 40 - 80)
  })

  it("parts the lines between the row and its target by the row's size and gap", () => {
    expect(lineShift(2, 1, 3, measure, 0)).toBe(-40)
    expect(lineShift(3, 1, 3, measure, 0)).toBe(-40)
    expect(lineShift(4, 1, 3, measure, 0)).toBe(0)
    expect(lineShift(1, 1, 3, measure, 0)).toBe(120)
    expect(lineShift(0, 2, 0, measure, 8)).toBe(88)
    expect(lineShift(2, 2, 0, measure, 8)).toBe(-80)
  })

  it("passes a neighbour when the row's centre crosses its midpoint, within the range", () => {
    // Row 1 (centre 60) dragged down.
    expect(targetFor(60, 1, 0, 4, measure)).toBe(1)
    expect(targetFor(121, 1, 0, 4, measure)).toBe(2)
    expect(targetFor(181, 1, 0, 4, measure)).toBe(3)
    expect(targetFor(999, 1, 0, 3, measure)).toBe(3)
    expect(targetFor(19, 1, 0, 4, measure)).toBe(0)
    expect(targetFor(-50, 3, 1, 4, measure)).toBe(1)
  })
})

describe("availability", () => {
  const none = { sorted: false, searched: false, filtered: false, grouped: false, paged: false, held: false, saving: false }

  it("is available when the visible order is the manual order", () => {
    expect(reorderUnavailable(none)).toBeNull()
  })

  it("explains each reason, the host's own first", () => {
    expect(reorderUnavailable({ ...none, sorted: true })).toBe("Clear sorting to reorder")
    expect(reorderUnavailable({ ...none, searched: true })).toBe(REORDER_REASONS.searched)
    expect(reorderUnavailable({ ...none, filtered: true })).toBe(REORDER_REASONS.filtered)
    expect(reorderUnavailable({ ...none, grouped: true })).toBe(REORDER_REASONS.grouped)
    expect(reorderUnavailable({ ...none, paged: true })).toBe(REORDER_REASONS.paged)
    expect(reorderUnavailable({ ...none, held: true })).toBe(REORDER_REASONS.held)
    expect(reorderUnavailable({ ...none, saving: true, sorted: true })).toBe(REORDER_REASONS.saving)
    expect(reorderUnavailable({ ...none, sorted: true, disabled: "Read-only queue" })).toBe("Read-only queue")
    expect(reorderUnavailable({ ...none, disabled: true })).toBe(REORDER_REASONS.disabled)
  })
})

describe("announcements", () => {
  it("names the row and its position", () => {
    expect(positionText(3, 12)).toBe("3 of 12")
    expect(positionText(1, 4, "Phones")).toBe("1 of 4 in Phones")
    expect(reorderMessages.lifted("NST-C106", "3 of 12")).toMatch(/^Lifted NST-C106, position 3 of 12\. Use the arrow keys/)
    expect(reorderMessages.failed("NST-C106", "3 of 12", "Offline.")).toBe("NST-C106 could not be moved: Offline. Returned to position 3 of 12.")
  })
})
