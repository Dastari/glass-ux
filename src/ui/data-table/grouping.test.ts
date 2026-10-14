import { describe, expect, it } from "vitest"
import {
  decodeCollapsed,
  decodeShown,
  EMPTY_GROUP_STATE,
  encodeCollapsed,
  encodeShown,
  groupItems,
  setCollapsed,
  showMore,
  shownFor,
  toggleCollapsed,
  type DataTableGroup,
  type GroupedItem,
} from "./grouping.js"
import { parseTableSearch, serializeTableSearch, type TableUrlConfig } from "./url-state.js"

interface Device {
  name: string
  cls: string
}

const rows: Device[] = [
  { name: "NST-C106", cls: "endpoint" },
  { name: "LMN-4E5E", cls: "endpoint" },
  { name: "FA-PHONE-204", cls: "voip-phone" },
  { name: "FA-PHONE-205", cls: "voip-phone" },
  { name: "FA-RICOH-L2", cls: "printer" },
]

const groups: DataTableGroup[] = [
  // The server's counts: more endpoints exist than were loaded.
  { id: "endpoint", label: "Endpoints", count: 117 },
  { id: "voip-phone", label: "Phones", count: 2 },
  { id: "printer", label: "Printers", count: 1 },
  { id: "camera", label: "Cameras", count: 0 },
]

const shape = (items: GroupedItem<Device>[]) =>
  items.map((item) => (item.kind === "row" ? item.row.name : item.kind === "group" ? `[${item.group.label}${item.collapsed ? " +" : ""}]` : `more ${item.group.id} ${item.loaded}/${item.group.count} next ${item.next}${item.pending ? " pending" : ""}`))

describe("groupItems", () => {
  it("lays out headers in the server's order, each group's rows, and Show more where the server has more", () => {
    const items = groupItems(rows, (row) => row.cls, groups, EMPTY_GROUP_STATE, 25)
    expect(shape(items)).toEqual([
      "[Endpoints]",
      "NST-C106",
      "LMN-4E5E",
      // 2 loaded of 117 but the page asked for 25: the rows are on their way.
      "more endpoint 2/117 next 25 pending",
      "[Phones]",
      "FA-PHONE-204",
      "FA-PHONE-205",
      "[Printers]",
      "FA-RICOH-L2",
    ])
  })

  it("leaves out empty groups and draws a collapsed group as its header alone", () => {
    const items = groupItems(rows, (row) => row.cls, groups, { collapsed: ["voip-phone"], shown: {} }, 25)
    expect(shape(items)).toContain("[Phones +]")
    expect(shape(items)).not.toContain("FA-PHONE-204")
    expect(shape(items).some((line) => line.includes("Cameras"))).toBe(false)
  })

  it("caps a group at its shown count and offers the rest", () => {
    const many = Array.from({ length: 30 }, (_, index) => ({ name: `E-${index}`, cls: "endpoint" }))
    const items = groupItems(many, (row) => row.cls, [{ id: "endpoint", label: "Endpoints", count: 117 }], EMPTY_GROUP_STATE, 25)
    expect(items.filter((item) => item.kind === "row")).toHaveLength(25)
    expect(shape(items).at(-1)).toBe("more endpoint 25/117 next 25")
    const more = groupItems(many, (row) => row.cls, [{ id: "endpoint", label: "Endpoints", count: 117 }], { collapsed: [], shown: { endpoint: 50 } }, 25)
    // Asked for 50, 30 arrived so far.
    expect(shape(more).at(-1)).toBe("more endpoint 30/117 next 25 pending")
  })

  it("never hides loaded rows the server did not group", () => {
    const items = groupItems([...rows, { name: "10.13.4.77", cls: "unknown" }], (row) => row.cls, groups, EMPTY_GROUP_STATE, 25)
    expect(shape(items).slice(-2)).toEqual(["[unknown]", "10.13.4.77"])
  })

  it("numbers headers for their own order", () => {
    const headers = groupItems(rows, (row) => row.cls, groups, EMPTY_GROUP_STATE).filter((item) => item.kind === "group")
    expect(headers.map((item) => (item.kind === "group" ? item.index : -1))).toEqual([0, 1, 2])
  })
})

describe("group state", () => {
  it("toggles one group, or every group with rows", () => {
    const one = toggleCollapsed(EMPTY_GROUP_STATE, "printer", groups)
    expect(one.collapsed).toEqual(["printer"])
    expect(toggleCollapsed(one, "printer", groups).collapsed).toEqual([])
    const all = toggleCollapsed(EMPTY_GROUP_STATE, "printer", groups, true)
    expect(all.collapsed).toEqual(["endpoint", "voip-phone", "printer"])
    expect(toggleCollapsed(all, "printer", groups, true).collapsed).toEqual([])
  })

  it("collapses and expands by value without duplicates", () => {
    const state = setCollapsed(EMPTY_GROUP_STATE, "endpoint", true)
    expect(setCollapsed(state, "endpoint", true)).toBe(state)
    expect(setCollapsed(state, "endpoint", false).collapsed).toEqual([])
  })

  it("shows a page more each time", () => {
    const once = showMore(EMPTY_GROUP_STATE, "endpoint", 25)
    expect(shownFor(once, "endpoint", 25)).toBe(50)
    expect(shownFor(showMore(once, "endpoint", 25), "endpoint", 25)).toBe(75)
    expect(shownFor(once, "printer", 25)).toBe(25)
  })
})

describe("group state in the URL", () => {
  it("round-trips collapsed ids and shown counts, escaping separators", () => {
    expect(encodeCollapsed([])).toBeUndefined()
    expect(decodeCollapsed(encodeCollapsed(["printer", "voip-phone", "a,b"]))).toEqual(["printer", "voip-phone", "a,b"])
    expect(encodeShown({})).toBeUndefined()
    expect(decodeShown(encodeShown({ endpoint: 50, "site:a": 75 }))).toEqual({ endpoint: 50, "site:a": 75 })
  })

  it("drops what it cannot read", () => {
    expect(decodeCollapsed(42)).toEqual([])
    expect(decodeShown("endpoint:abc,printer:-5,camera:50,:10")).toEqual({ camera: 50 })
  })

  const config: TableUrlConfig = { prefix: "dev", sortable: ["name"], pageSizes: [25], defaultPageSize: 25, grouped: true }

  it("reads and writes them under the table's prefix, omitting defaults", () => {
    const state = parseTableSearch({ "dev.collapsed": "printer,camera", "dev.shown": "endpoint:50" }, config)
    expect(state.groups).toEqual({ collapsed: ["printer", "camera"], shown: { endpoint: 50 } })
    const written = serializeTableSearch({ ...state, groups: { collapsed: [], shown: {} } }, config)
    expect(written["dev.collapsed"]).toBeUndefined()
    expect(written["dev.shown"]).toBeUndefined()
    expect(serializeTableSearch(state, config)["dev.collapsed"]).toBe("printer,camera")
  })

  it("leaves the keys alone for a table that does not group", () => {
    const flat = { ...config, grouped: false }
    expect(parseTableSearch({ "dev.collapsed": "printer" }, flat).groups).toBeUndefined()
    expect("dev.collapsed" in serializeTableSearch({ sorting: [], pagination: { pageIndex: 0, pageSize: 25 } }, flat)).toBe(false)
  })
})
