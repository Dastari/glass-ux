import { describe, expect, it } from "vitest"
import { assignValues, filterTransferItems, rangeValues, reorderValues, transferRows, unassignValues, type TransferItem } from "./transfer.js"

const ITEMS: TransferItem[] = [
  { value: "a", label: "View assets", group: "Assets" },
  { value: "r", label: "View reports", group: "Reports", keywords: ["analytics"] },
  { value: "b", label: "Edit assets", group: "Assets", description: "assets.edit" },
  { value: "x", label: "Audit log", disabled: true },
  { value: "c", label: "Export reports", group: "Reports" },
]

describe("transfer list logic", () => {
  it("filters on label, description and keywords", () => {
    expect(filterTransferItems(ITEMS, "ASSETS", "en").map((i) => i.value)).toEqual(["a", "b"])
    expect(filterTransferItems(ITEMS, "analytics", "en").map((i) => i.value)).toEqual(["r"])
    expect(filterTransferItems(ITEMS, "  ", "en")).toHaveLength(5)
  })

  it("groups rows under headings in first-seen order, ungrouped items first", () => {
    expect(transferRows(ITEMS, true).map((row) => (row.kind === "group" ? `#${row.label}` : row.item.value))).toEqual(["x", "#Assets", "a", "b", "#Reports", "r", "c"])
    expect(transferRows(ITEMS, false).every((row) => row.kind === "item")).toBe(true)
  })

  it("assigns in item order after the assigned ones, and unassigns keeping order", () => {
    expect(assignValues(["c"], ["b", "a", "c"], ITEMS)).toEqual(["c", "a", "b"])
    expect(unassignValues(["c", "a", "b"], ["a"])).toEqual(["c", "b"])
  })

  it("reorders one value", () => {
    expect(reorderValues(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"])
    expect(reorderValues(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"])
    expect(reorderValues(["a", "b"], 5, 0)).toEqual(["a", "b"])
  })

  it("selects an enabled range in either direction", () => {
    expect(rangeValues(ITEMS, "a", "c")).toEqual(["a", "r", "b", "c"])
    expect(rangeValues(ITEMS, "c", "b")).toEqual(["b", "c"])
    expect(rangeValues(ITEMS, "missing", "b")).toEqual(["b"])
  })
})
