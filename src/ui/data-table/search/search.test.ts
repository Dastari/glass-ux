import { describe, expect, it } from "vitest"
import { createDataTableColumns } from "../columns.js"
import { filters } from "../filters/kinds.js"
import { emptyText } from "./empty-text.js"
import { matchesSearch, searchFields, searchRows } from "./match.js"
import { normalizeSearch, type DataTableSearch } from "./types.js"

interface Device {
  id: string
  name: string
  serial: string | null
  ip?: string
  code: string
}

const col = createDataTableColumns<Device>()
const columns = col.columns([
  col.accessor("name", { header: "Device", filter: filters.text({ field: "Name" }) }),
  col.accessor((row) => row.serial, { id: "serial", header: "Serial", filter: filters.text({ field: "Serial" }) }),
  col.accessor((row) => row.ip ?? null, { id: "ip", header: "IP address", filter: { none: "test" } }),
])
const rows: Device[] = [
  { id: "1", name: "NST-C106", serial: "8CC0481GWV", ip: "10.0.0.7", code: "GSB" },
  { id: "2", name: "LMN-4E5E", serial: null, code: "ORB" },
  { id: "3", name: "orb-0007", serial: "5CG2101XYZ", ip: "10.0.0.8", code: "ORB" },
]
const spec: DataTableSearch<Device> = { fields: ["name", "serial", "ip", { field: "Code", value: (row) => row.code }] }

describe("searchFields", () => {
  it("resolves column ids to their filter's field and accessor, and keeps refs as given", () => {
    const fields = searchFields(spec, columns)
    // "ip" has no filter field, so it cannot be searched by id.
    expect(fields.map((entry) => entry.field)).toEqual(["Name", "Serial", "Code"])
    expect(fields.map((entry) => entry.getValue?.(rows[0]!))).toEqual(["NST-C106", "8CC0481GWV", "GSB"])
  })
})

describe("local search", () => {
  it("ignores accents, as the palette does", () => {
    const people: Device[] = [{ id: "1", name: "Müller", serial: null, code: "A" }, { id: "2", name: "Mueller", serial: null, code: "B" }]
    const names: DataTableSearch<Device> = { fields: [{ field: "Name", value: (row) => row.name }] }
    expect(searchRows(people, "Muller", names).map((row) => row.id)).toEqual(["1"])
    expect(searchRows(people, "müLLer", names).map((row) => row.id)).toEqual(["1"])
    expect(matchesSearch(people[0]!, "MULLER", names, [], "de")).toBe(true)
  })
  it("lower-cases by the locale", () => {
    const places: Device[] = [{ id: "1", name: "Isparta", serial: null, code: "A" }, { id: "2", name: "İsparta", serial: null, code: "B" }]
    const names: DataTableSearch<Device> = { fields: [{ field: "Name", value: (row) => row.name }] }
    // Turkish keeps dotted and dotless I apart; other locales do not.
    expect(searchRows(places, "ISPARTA", names, [], "tr").map((row) => row.id)).toEqual(["1"])
    expect(searchRows(places, "ISPARTA", names, [], "en").map((row) => row.id)).toEqual(["1", "2"])
  })
  it("matches any field, ignoring case, and never an empty value", () => {
    expect(searchRows(rows, "orb", spec, columns).map((row) => row.id)).toEqual(["2", "3"])
    expect(searchRows(rows, "GWV", spec, columns).map((row) => row.id)).toEqual(["1"])
    expect(searchRows(rows, "nst", spec, columns).map((row) => row.id)).toEqual(["1"])
    expect(searchRows(rows, "null", spec, columns)).toEqual([])
    // IP is not searched: its column has no field.
    expect(searchRows(rows, "10.0.0", spec, columns)).toEqual([])
  })

  it("matches everything for an empty or blank query, and without a spec", () => {
    expect(searchRows(rows, "", spec, columns)).toEqual(rows)
    expect(searchRows(rows, "   ", spec, columns)).toEqual(rows)
    expect(searchRows(rows, "orb", undefined, columns)).toEqual(rows)
    expect(matchesSearch(rows[0]!, undefined, spec, columns)).toBe(true)
  })

  it("trims the query as the server does", () => {
    expect(searchRows(rows, "  0007 ", spec, columns).map((row) => row.id)).toEqual(["3"])
  })
})

describe("normalizeSearch", () => {
  it("trims, caps, and reads numbers and booleans as text", () => {
    expect(normalizeSearch("  orb 7 ")).toBe("orb 7")
    expect(normalizeSearch(undefined)).toBe("")
    expect(normalizeSearch(42)).toBe("42")
    expect(normalizeSearch(`${"a".repeat(199)} b`)).toBe("a".repeat(199))
  })
})

describe("emptyText", () => {
  const noun = { other: "devices" }
  it("says what was searched and how many filters, or falls back", () => {
    expect(emptyText(noun, "orb-7", 2, "No devices")).toBe('No devices match "orb-7" and 2 filters')
    expect(emptyText(noun, "orb-7", 1, "No devices")).toBe('No devices match "orb-7" and 1 filter')
    expect(emptyText(noun, "orb-7", 0, "No devices")).toBe('No devices match "orb-7"')
    expect(emptyText(noun, "", 3, "No devices")).toBe("No devices match these filters")
    expect(emptyText(noun, "", 0, "No devices")).toBe("No devices")
  })
})
