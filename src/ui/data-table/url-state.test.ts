import { describe, expect, it } from "vitest"
import { filters } from "./filters/kinds.js"
import type { FilterColumn } from "./filters/types.js"
import { decodeSorting, encodeSorting, parseTableSearch, serializeTableSearch, type TableUrlConfig } from "./url-state.js"

const config: TableUrlConfig = {
  sortable: ["name", "lastSeen", "os"],
  pageSizes: [25, 50, 100],
  defaultPageSize: 25,
  defaultSorting: [{ id: "name", desc: false }],
}

describe("parseTableSearch", () => {
  it("falls back to defaults for an empty search", () => {
    expect(parseTableSearch({}, config)).toEqual({
      sorting: [{ id: "name", desc: false }],
      pagination: { pageIndex: 0, pageSize: 25 },
      filters: [],
      search: "",
    })
  })

  it("reads sorting, page and size", () => {
    expect(parseTableSearch({ sort: "lastSeen.desc,os", page: 3, size: "50" }, config)).toEqual({
      sorting: [
        { id: "lastSeen", desc: true },
        { id: "os", desc: false },
      ],
      pagination: { pageIndex: 2, pageSize: 50 },
      filters: [],
      search: "",
    })
  })

  it("rejects unknown columns, duplicates, bad pages and sizes not offered", () => {
    const state = parseTableSearch({ sort: "serial,os.desc,os", page: "-2", size: 37 }, config)
    expect(state.sorting).toEqual([{ id: "os", desc: true }])
    expect(state.pagination).toEqual({ pageIndex: 0, pageSize: 25 })
    expect(parseTableSearch({ page: "2.5" }, config).pagination.pageIndex).toBe(0)
    expect(parseTableSearch({ page: "abc" }, config).pagination.pageIndex).toBe(0)
  })

  it("keeps an explicitly empty sort", () => {
    expect(parseTableSearch({ sort: "" }, config).sorting).toEqual([])
  })

  it("namespaces keys with a prefix", () => {
    const prefixed = { ...config, prefix: "ep" }
    expect(parseTableSearch({ "ep.page": 2, page: 9 }, prefixed).pagination.pageIndex).toBe(1)
  })
})

describe("serializeTableSearch", () => {
  it("omits defaults", () => {
    expect(serializeTableSearch({ sorting: [{ id: "name", desc: false }], pagination: { pageIndex: 0, pageSize: 25 } }, config)).toEqual({
      sort: undefined,
      page: undefined,
      size: undefined,
    })
  })

  it("writes non-default values and round-trips", () => {
    const state = { sorting: [{ id: "lastSeen", desc: true }], pagination: { pageIndex: 4, pageSize: 100 }, filters: [], search: "" }
    const search = serializeTableSearch(state, config)
    expect(search).toEqual({ sort: "lastSeen.desc", page: 5, size: 100 })
    expect(parseTableSearch(search, config)).toEqual(state)
  })

  it("encodes an empty sort when the default is not empty", () => {
    expect(serializeTableSearch({ sorting: [], pagination: { pageIndex: 0, pageSize: 25 } }, config).sort).toBe("")
  })
})

describe("search in the URL", () => {
  const base = { sorting: [{ id: "name", desc: false }], pagination: { pageIndex: 0, pageSize: 25 }, filters: [] }

  it("reads q, trimmed and capped, and \"\" when absent", () => {
    expect(parseTableSearch({ q: "orb-7" }, config).search).toBe("orb-7")
    expect(parseTableSearch({ q: "  orb 7  " }, config).search).toBe("orb 7")
    expect(parseTableSearch({}, config).search).toBe("")
    expect(parseTableSearch({ q: "   " }, config).search).toBe("")
    expect(parseTableSearch({ q: "x".repeat(500) }, config).search).toHaveLength(200)
  })

  it("reads a query the router parsed as a number or a boolean as its text", () => {
    expect(parseTableSearch({ q: 8840 }, config).search).toBe("8840")
    expect(parseTableSearch({ q: true }, config).search).toBe("true")
    expect(parseTableSearch({ q: ["a"] }, config).search).toBe("")
  })

  it("omits an empty query and round-trips a set one", () => {
    expect(serializeTableSearch({ ...base, search: "" }, config).q).toBeUndefined()
    expect(serializeTableSearch({ ...base, search: "  " }, config).q).toBeUndefined()
    const search = serializeTableSearch({ ...base, search: " NST " }, config)
    expect(search).toEqual({ sort: undefined, q: "NST", page: undefined, size: undefined })
    expect(parseTableSearch(search, config)).toEqual({ ...base, search: "NST" })
  })

  it("namespaces q with the prefix", () => {
    const prefixed = { ...config, prefix: "dev" }
    expect(parseTableSearch({ "dev.q": "orb", q: "other" }, prefixed).search).toBe("orb")
    expect(serializeTableSearch({ ...base, search: "orb" }, prefixed)).toMatchObject({ "dev.q": "orb" })
    expect(serializeTableSearch({ ...base, search: "orb" }, prefixed)).not.toHaveProperty("q")
  })
})

describe("sorting codec", () => {
  it("encodes multi-sort in order", () => {
    expect(encodeSorting([{ id: "os", desc: false }, { id: "lastSeen", desc: true }])).toBe("os,lastSeen.desc")
    expect(decodeSorting("os.asc", ["os"])).toEqual([{ id: "os", desc: false }])
    expect(decodeSorting(42, ["os"])).toBeNull()
  })
})

describe("filters in the URL", () => {
  const filterColumns: FilterColumn[] = [
    { id: "os", header: "OS", spec: filters.options({ field: "Os", options: [{ value: "Windows 11 Pro", label: "Windows 11 Pro" }, { value: "macOS 15", label: "macOS 15" }] }) },
    { id: "lastSeen", header: "Last seen", spec: filters.date({ field: "LastSeen", storage: "rfc3339" }) },
    { id: "memory", header: "Memory", spec: filters.number({ field: "MemoryUsed", server: "decimal", unit: "%", scale: 0.01, min: 0, max: 100 }) },
  ]
  const withFilters: TableUrlConfig = { ...config, columns: filterColumns }

  it("reads one f.<column> param per filterable column, validated", () => {
    const state = parseTableSearch({ "f.os": "in:Windows 11 Pro,macOS 15", "f.lastSeen": "recent:7", "f.memory": "gt:500", "f.cpu": "gt:5" }, withFilters)
    expect(state.filters).toEqual([
      { id: "os", value: { op: "in", values: ["Windows 11 Pro", "macOS 15"] } },
      { id: "lastSeen", value: { op: "recent", days: 7 } },
    ])
  })

  it("writes filters relative, removes cleared ones and round-trips", () => {
    const state = {
      sorting: [{ id: "name", desc: false }],
      pagination: { pageIndex: 0, pageSize: 25 },
      filters: [
        { id: "lastSeen", value: { op: "olderThan", days: 30 } },
        { id: "memory", value: { op: "between", min: 20, max: 80 } },
      ],
      search: "",
    }
    const search = serializeTableSearch(state, withFilters)
    expect(search).toEqual({ sort: undefined, "f.os": undefined, "f.lastSeen": "olderThan:30", "f.memory": "between:20..80", page: undefined, size: undefined })
    expect(parseTableSearch(search, withFilters)).toEqual(state)
  })

  it("namespaces filter keys with the prefix", () => {
    const prefixed = { ...withFilters, prefix: "dev" }
    expect(parseTableSearch({ "dev.f.lastSeen": "today", "f.lastSeen": "future" }, prefixed).filters).toEqual([{ id: "lastSeen", value: { op: "today" } }])
    expect(serializeTableSearch({ sorting: [], pagination: { pageIndex: 0, pageSize: 25 }, filters: [{ id: "lastSeen", value: { op: "today" } }] }, prefixed)["dev.f.lastSeen"]).toBe("today")
  })

  it("omits default filters and keeps a removed default removed", () => {
    const defaults = { ...withFilters, defaultFilters: [{ id: "lastSeen", value: { op: "recent", days: 30 } }] }
    expect(parseTableSearch({}, defaults).filters).toEqual([{ id: "lastSeen", value: { op: "recent", days: 30 } }])
    const base = { sorting: [{ id: "name", desc: false }], pagination: { pageIndex: 0, pageSize: 25 } }
    expect(serializeTableSearch({ ...base, filters: [{ id: "lastSeen", value: { op: "recent", days: 30 } }] }, defaults)["f.lastSeen"]).toBeUndefined()
    const cleared = serializeTableSearch({ ...base, filters: [] }, defaults)
    expect(cleared["f.lastSeen"]).toBe("")
    expect(parseTableSearch(cleared, defaults).filters).toEqual([])
  })

  it("writes yes/no as booleans so the router does not quote them", () => {
    const online: FilterColumn[] = [{ id: "online", header: "Status", spec: filters.boolean({ field: "Online", labels: { true: "Online", false: "Offline" } }) }]
    const search = serializeTableSearch({ sorting: [], pagination: { pageIndex: 0, pageSize: 25 }, filters: [{ id: "online", value: { op: "eq", value: false } }] }, { ...config, columns: online })
    expect(search["f.online"]).toBe(false)
    expect(parseTableSearch(search, { ...config, columns: online }).filters).toEqual([{ id: "online", value: { op: "eq", value: false } }])
  })

  it("leaves filters out entirely when the config has no columns", () => {
    expect(parseTableSearch({ "f.os": "in:macOS 15" }, config).filters).toEqual([])
    expect(Object.keys(serializeTableSearch({ sorting: [], pagination: { pageIndex: 0, pageSize: 25 } }, config))).toEqual(["sort", "q", "page", "size"])
  })
})
