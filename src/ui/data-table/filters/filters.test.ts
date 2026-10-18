import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { decodeFilter, decodeList, encodeFilter, encodeList, isValidFilter } from "./codec.js"
import { hintFrom } from "./controller.js"
import { filters } from "./kinds.js"
import { filterRows, matchesFilter } from "./match.js"
import { numberComparisons } from "./semantics.js"
import { presetLabel, summarize } from "./summary.js"
import type { FilterColumn } from "./types.js"

const previousTz = process.env.TZ
beforeAll(() => {
  process.env.TZ = "Australia/Hobart"
})
afterAll(() => {
  process.env.TZ = previousTz
})

const text = filters.text({ field: "Serial" })
const free = filters.text({ field: "Notes", operators: ["contains"], nullable: false })
const memory = filters.number({ field: "MemoryUsed", server: "decimal", unit: "%", scale: 0.01, min: 0, max: 100 })
const seen = filters.date({ field: "LastSeen", storage: "rfc3339" })
const due = filters.date({ field: "DueOn", storage: "calendar-date", operators: ["before", "after"] })
const online = filters.boolean({ field: "Online", labels: { true: "Online", false: "Offline" } })
const site = filters.options({ field: "Site", options: [{ value: "Mossbridge", label: "Mossbridge" }, { value: "Swansea", label: "Swansea" }] })
const tier = filters.options({ field: "Tier", server: "int", source: { search: async () => [] } })
const org = filters.uuid({ field: "OrganisationId", labelOf: (id) => (id.startsWith("5b163") ? "Northstar Studio" : id) })
const ORG = "5b16387d-8a01-5125-8c20-58511e60c6e3"

describe("builders", () => {
  it("restrict operators to what the column offers", () => {
    expect(text.operators).toContain("in")
    expect(free.operators).toEqual(["contains"])
    expect(filters.text({ field: "Hostname", nullable: false }).operators).not.toContain("isEmpty")
    expect(online.nullable).toBe(false)
    expect(filters.boolean({ field: "Encrypted", labels: { true: "Encrypted", false: "Not encrypted", empty: "Unknown" } }).nullable).toBe(true)
    expect(memory.scale).toBe(0.01)
  })
})

describe("list codec", () => {
  it("escapes commas and backslashes", () => {
    const values = ["a,b", "c\\d", "plain"]
    expect(decodeList(encodeList(values))).toEqual(values)
    expect(encodeList(["Windows 11 Pro", "macOS 15"])).toBe("Windows 11 Pro,macOS 15")
  })
  it("drops blanks and duplicates", () => {
    expect(decodeList("a,,a,b,")).toEqual(["a", "b"])
  })
})

describe("URL codec", () => {
  const roundTrips: Array<[Parameters<typeof encodeFilter>[0], unknown, string]> = [
    [text, { op: "contains", value: "8CC" }, "contains:8CC"],
    [text, { op: "eq", value: "a:b" }, "eq:a:b"],
    [text, { op: "in", values: ["8CC0481GWV", "5CG2101XYZ"] }, "in:8CC0481GWV,5CG2101XYZ"],
    [text, { op: "isEmpty" }, "isEmpty"],
    [memory, { op: "gt", value: 50 }, "gt:50"],
    [memory, { op: "between", min: 20.5, max: 80 }, "between:20.5..80"],
    [seen, { op: "recent", days: 7 }, "recent:7"],
    [seen, { op: "olderThan", days: 30 }, "olderThan:30"],
    [seen, { op: "last24h" }, "last24h"],
    [seen, { op: "before", at: "2026-10-01" }, "before:2026-10-01"],
    [seen, { op: "between", start: "2026-10-01", end: "2026-10-13" }, "between:2026-10-01..2026-10-13"],
    [seen, { op: "after", at: "2026-10-01T04:00:00Z" }, "after:2026-10-01T04:00:00Z"],
    [online, { op: "eq", value: false }, "false"],
    [site, { op: "notIn", values: ["Swansea"] }, "notIn:Swansea"],
    [org, { op: "eq", value: ORG }, `eq:${ORG}`],
  ]
  for (const [spec, value, encoded] of roundTrips) {
    it(`${spec.kind} ${encoded}`, () => {
      expect(encodeFilter(spec, value)).toBe(encoded)
      expect(decodeFilter(spec, encoded)).toEqual(value)
    })
  }

  it("accepts values the router parsed as JSON", () => {
    expect(decodeFilter(online, true)).toEqual({ op: "eq", value: true })
    expect(decodeFilter(online, "true")).toEqual({ op: "eq", value: true })
  })

  it("drops operators the column does not offer", () => {
    expect(decodeFilter(free, "eq:x")).toBeNull()
    expect(decodeFilter(due, "between:2026-10-01..2026-10-02")).toBeNull()
    expect(decodeFilter(online, "isEmpty")).toBeNull()
    expect(decodeFilter(filters.text({ field: "Hostname", nullable: false }), "isEmpty")).toBeNull()
  })

  it("drops malformed and out-of-range values", () => {
    expect(decodeFilter(text, "contains:")).toBeNull()
    expect(decodeFilter(text, "nonsense")).toBeNull()
    expect(decodeFilter(text, "")).toBeNull()
    expect(decodeFilter(text, { op: "eq" })).toBeNull()
    expect(decodeFilter(memory, "gt:abc")).toBeNull()
    expect(decodeFilter(memory, "gt:150")).toBeNull()
    expect(decodeFilter(memory, "between:80..20")).toBeNull()
    expect(decodeFilter(memory, "between:1..2..3")).toBeNull()
    expect(decodeFilter(seen, "recent:0")).toBeNull()
    expect(decodeFilter(seen, "recent:2.5")).toBeNull()
    expect(decodeFilter(seen, "recent:99999")).toBeNull()
    expect(decodeFilter(seen, "before:2026-02-30")).toBeNull()
    expect(decodeFilter(seen, "between:2026-10-13..2026-10-01")).toBeNull()
    expect(decodeFilter(seen, "between:2026-10-01..2026-10-02T00:00:00Z")).toBeNull()
    expect(decodeFilter(due, "last24h")).toBeNull()
    expect(decodeFilter(due, "before:2026-10-01T00:00:00Z")).toBeNull()
    expect(decodeFilter(org, "eq:not-a-uuid")).toBeNull()
  })

  it("keeps only offered values of a closed set, and well-formed ones of an open set", () => {
    expect(decodeFilter(site, "in:Swansea,Narnia")).toEqual({ op: "in", values: ["Swansea"] })
    expect(decodeFilter(site, "in:Narnia")).toBeNull()
    expect(decodeFilter(tier, "in:1,x,3")).toEqual({ op: "in", values: ["1", "3"] })
  })

  it("decodes custom columns with their own codec and survives a throwing decoder", () => {
    const custom = filters.custom<number>({
      editor: () => null,
      summary: (value, label) => `${label} ≥ ${value}`,
      encode: (value) => String(value),
      decode: (raw) => {
        if (raw === "boom") throw new Error("bad")
        return Number.isInteger(Number(raw)) ? Number(raw) : null
      },
      toCondition: (value) => ({ PatchLevelGte: value }),
    })
    expect(decodeFilter(custom, "2")).toBe(2)
    expect(decodeFilter(custom, "x")).toBeNull()
    expect(decodeFilter(custom, "boom")).toBeNull()
    expect(isValidFilter(custom, 3)).toBe(true)
  })

  it("validates whole values", () => {
    expect(isValidFilter(memory, { op: "between", min: 1, max: 2 })).toBe(true)
    expect(isValidFilter(memory, { op: "between", min: 2, max: 1 })).toBe(false)
    expect(isValidFilter(text, undefined)).toBe(false)
  })
})

describe("summaries", () => {
  it("say what the filter selects, in the column's words", () => {
    expect(summarize(site, "Site", { op: "in", values: ["Mossbridge", "Swansea"] })).toBe("Site: Mossbridge, Swansea")
    expect(summarize(site, "Site", { op: "in", values: ["a", "b", "c", "d"] })).toBe("Site: a, b +2")
    expect(summarize(site, "Site", { op: "notIn", values: ["Swansea"] })).toBe("Site: not Swansea")
    expect(summarize(memory, "Memory", { op: "gt", value: 50 })).toBe("Memory > 50%")
    expect(summarize(memory, "Memory", { op: "between", min: 20, max: 80.5 })).toBe("Memory 20–80.5%")
    expect(summarize(seen, "Last seen", { op: "recent", days: 7 })).toBe("Last seen: last 7 days")
    expect(summarize(seen, "Last seen", { op: "olderThan", days: 30 })).toBe("Last seen: more than 30 days ago")
    expect(summarize(seen, "Last seen", { op: "before", at: "2026-10-01" })).toBe("Last seen before 1 Oct 2026")
    expect(summarize(seen, "Last seen", { op: "between", start: "2026-10-01", end: "2026-10-13" })).toBe("Last seen: 1–13 Oct 2026")
    expect(summarize(text, "Serial", { op: "contains", value: "8CC" })).toBe('Serial contains "8CC"')
    expect(summarize(text, "Serial", { op: "isEmpty" })).toBe("Serial is empty")
    expect(summarize(online, "Status", { op: "eq", value: true })).toBe("Online")
    expect(summarize(org, "Organisation", { op: "eq", value: ORG })).toBe("Organisation is Northstar Studio")
    expect(summarize(tier, "Tier", { op: "in", values: ["1"] }, new Map([["1", "Gold"]]))).toBe("Tier: Gold")
  })
  it("names presets", () => {
    expect(presetLabel({ op: "last24h" })).toBe("Last 24 hours")
    expect(presetLabel({ op: "future" })).toBe("In the future")
  })
  it("strip the column name where a menu already shows it", () => {
    expect(hintFrom("Memory > 50%", "Memory")).toBe("> 50%")
    expect(hintFrom("OS: Windows 11 Pro", "OS")).toBe("Windows 11 Pro")
    expect(hintFrom("Online", "Status")).toBe("Online")
  })
})

describe("local matching", () => {
  const now = () => new Date("2026-10-13T10:30:15+11:00")
  it("follows SQL NULL rules", () => {
    expect(matchesFilter(text, null, { op: "ne", value: "x" })).toBe(false)
    expect(matchesFilter(text, null, { op: "notIn", values: ["x"] })).toBe(false)
    expect(matchesFilter(text, "", { op: "isEmpty" })).toBe(true)
    expect(matchesFilter(memory, null, { op: "isEmpty" })).toBe(true)
    expect(matchesFilter(memory, 0, { op: "isEmpty" })).toBe(false)
  })
  it("ignores case only for contains, starts with and ends with", () => {
    expect(matchesFilter(text, "8cc0481gwv", { op: "contains", value: "8CC" })).toBe(true)
    expect(matchesFilter(text, "8cc0481gwv", { op: "eq", value: "8CC0481GWV" })).toBe(false)
  })
  it("compares numbers in stored units", () => {
    expect(matchesFilter(memory, 0.57, { op: "gte", value: 57 })).toBe(true)
    expect(matchesFilter(memory, 0.5, { op: "gt", value: 50 })).toBe(false)
    expect(numberComparisons({ op: "gt", value: 57 }, memory)).toEqual([["gt", 0.57]])
  })
  it("uses the local day for presets", () => {
    const midnight = new Date("2026-10-13T00:00:00+11:00").getTime()
    expect(matchesFilter(seen, midnight, { op: "today" }, { now: now() })).toBe(true)
    expect(matchesFilter(seen, midnight - 1000, { op: "today" }, { now: now() })).toBe(false)
    expect(matchesFilter(seen, "2026-10-12T13:00:00Z", { op: "today" }, { now: now() })).toBe(true)
  })
  it("filters a fully loaded list", () => {
    type Row = { site: string; memory: number }
    const rows: Row[] = [
      { site: "Mossbridge", memory: 0.7 },
      { site: "Swansea", memory: 0.7 },
      { site: "Mossbridge", memory: 0.2 },
    ]
    const columns: Array<FilterColumn & { getValue: (row: Row) => unknown }> = [
      { id: "site", header: "Site", spec: site, getValue: (row) => row.site },
      { id: "memory", header: "Memory", spec: memory, getValue: (row) => row.memory },
    ]
    const state = [
      { id: "site", value: { op: "in", values: ["Mossbridge"] } },
      { id: "memory", value: { op: "gt", value: 50 } },
    ]
    expect(filterRows(rows, state, columns)).toEqual([rows[0]])
    expect(filterRows(rows, [], columns)).toEqual(rows)
  })
})
