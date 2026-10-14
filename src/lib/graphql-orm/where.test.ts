import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { filters } from "../../ui/data-table/filters/kinds.js"
import type { FilterColumn, FilterSpec } from "../../ui/data-table/filters/types.js"
import type { DataTableSearch } from "../../ui/data-table/search/types.js"
import { columnWhere, decimalText, rfc3339, searchWhere, toFilterInput, toWhere } from "./where.js"

// Tasmania: AEST (+10) until daylight saving starts on Sunday 4 October 2026, then AEDT (+11).
const previousTz = process.env.TZ
beforeAll(() => {
  process.env.TZ = "Australia/Hobart"
})
afterAll(() => {
  process.env.TZ = previousTz
})

/** 13 Oct 2026, 10:30:15.5 am in Hobart (AEDT). */
const now = () => new Date("2026-10-13T10:30:15.500+11:00")
const at = (spec: FilterSpec, value: unknown) => columnWhere(spec, value, { now: now() })
const utc = (...parts: [number, number, number, number?, number?, number?]) => rfc3339(Date.UTC(...parts))
const epoch = (...parts: [number, number, number, number?, number?, number?]) => Date.UTC(...parts) / 1000

describe("text → StringFilter", () => {
  const spec = filters.text({ field: "Serial" })
  it("maps every operator", () => {
    expect(at(spec, { op: "contains", value: "8CC" })).toEqual({ Serial: { Contains: "8CC" } })
    expect(at(spec, { op: "startsWith", value: "8CC" })).toEqual({ Serial: { StartsWith: "8CC" } })
    expect(at(spec, { op: "endsWith", value: "GWV" })).toEqual({ Serial: { EndsWith: "GWV" } })
    expect(at(spec, { op: "eq", value: "8CC0481GWV" })).toEqual({ Serial: { Eq: "8CC0481GWV" } })
    expect(at(spec, { op: "ne", value: "8CC0481GWV" })).toEqual({ Serial: { Ne: "8CC0481GWV" } })
    expect(at(spec, { op: "in", values: ["A1", "B2"] })).toEqual({ Serial: { InList: ["A1", "B2"] } })
    expect(at(spec, { op: "notIn", values: ["A1"] })).toEqual({ Serial: { NotIn: ["A1"] } })
  })
  it("treats NULL and the empty string alike", () => {
    expect(at(spec, { op: "isEmpty" })).toEqual({ Or: [{ Serial: { IsNull: true } }, { Serial: { Eq: "" } }] })
    expect(at(spec, { op: "isNotEmpty" })).toEqual({ And: [{ Serial: { IsNull: false } }, { Serial: { Ne: "" } }] })
  })
})

describe("number → IntFilter / DecimalFilter", () => {
  const memory = filters.number({ field: "MemoryUsed", server: "decimal", unit: "%", scale: 0.01 })
  it("converts the display unit to the stored unit, as exact Decimal text", () => {
    expect(at(memory, { op: "gt", value: 50 })).toEqual({ MemoryUsed: { Gt: "0.5" } })
    expect(at(memory, { op: "lte", value: 57 })).toEqual({ MemoryUsed: { Lte: "0.57" } })
    expect(at(memory, { op: "between", min: 20, max: 80 })).toEqual({ MemoryUsed: { Gte: "0.2", Lte: "0.8" } })
    expect(at(memory, { op: "eq", value: 33.3 })).toEqual({ MemoryUsed: { Eq: "0.333" } })
    expect(at(memory, { op: "ne", value: 0 })).toEqual({ MemoryUsed: { Ne: "0" } })
  })
  it("uses IsNull for emptiness", () => {
    expect(at(memory, { op: "isEmpty" })).toEqual({ MemoryUsed: { IsNull: true } })
    expect(at(memory, { op: "isNotEmpty" })).toEqual({ MemoryUsed: { IsNull: false } })
  })
  it("sends whole numbers to an IntFilter, moving fractional bounds to the equivalent one", () => {
    const disk = filters.number({ field: "DiskFreeMb", server: "int", unit: "GB", scale: 1024 })
    expect(at(disk, { op: "gt", value: 1.5 })).toEqual({ DiskFreeMb: { Gt: 1536 } })
    const permille = filters.number({ field: "LossPermille", server: "int", unit: "%", scale: 10 })
    expect(at(permille, { op: "gt", value: 2.55 })).toEqual({ LossPermille: { Gt: 25 } })
    expect(at(permille, { op: "gte", value: 2.55 })).toEqual({ LossPermille: { Gte: 26 } })
    expect(at(permille, { op: "lt", value: 2.55 })).toEqual({ LossPermille: { Lt: 26 } })
    expect(at(permille, { op: "lte", value: 2.55 })).toEqual({ LossPermille: { Lte: 25 } })
    expect(at(permille, { op: "eq", value: 2.55 })).toEqual({ LossPermille: { Eq: 26 } })
    expect(at(permille, { op: "between", min: 2.55, max: 3.01 })).toEqual({ LossPermille: { Gte: 26, Lte: 30 } })
  })
  it("writes Decimal text without exponents", () => {
    expect(decimalText(0.0000001)).toBe("0.0000001")
    expect(decimalText(57 * 0.01)).toBe("0.57")
  })
})

describe("date → DateFilter from the user's local day", () => {
  const seen = filters.date({ field: "LastSeen", storage: "rfc3339" })
  it("computes presets from local midnights, sent as UTC", () => {
    expect(at(seen, { op: "today" })).toEqual({ LastSeen: { Gte: "2026-10-12T13:00:00Z", Lt: "2026-10-13T13:00:00Z" } })
    expect(at(seen, { op: "last24h" })).toEqual({ LastSeen: { Gte: "2026-10-11T23:30:15Z" } })
    expect(at(seen, { op: "recent", days: 7 })).toEqual({ LastSeen: { Gte: "2026-10-06T13:00:00Z", Lt: "2026-10-13T13:00:00Z" } })
    expect(at(seen, { op: "future" })).toEqual({ LastSeen: { Gt: "2026-10-12T23:30:15Z" } })
  })
  it("keeps local midnight across daylight saving", () => {
    // 14 September is before daylight saving (+10).
    expect(at(seen, { op: "recent", days: 30 })).toEqual({ LastSeen: { Gte: "2026-09-13T14:00:00Z", Lt: "2026-10-13T13:00:00Z" } })
    expect(at(seen, { op: "olderThan", days: 30 })).toEqual({ LastSeen: { Lt: "2026-09-12T14:00:00Z" } })
    expect(at(seen, { op: "olderThan", days: 90 })).toEqual({ LastSeen: { Lt: "2026-07-14T14:00:00Z" } })
  })
  it("maps days to Lt / Gte, a range of days to the midnight after its last day", () => {
    expect(at(seen, { op: "before", at: "2026-10-01" })).toEqual({ LastSeen: { Lt: "2026-09-30T14:00:00Z" } })
    expect(at(seen, { op: "after", at: "2026-10-05" })).toEqual({ LastSeen: { Gte: "2026-10-04T13:00:00Z" } })
    expect(at(seen, { op: "between", start: "2026-10-01", end: "2026-10-05" })).toEqual({
      LastSeen: { Gte: "2026-09-30T14:00:00Z", Lt: "2026-10-05T13:00:00Z" },
    })
  })
  it("maps instants unchanged, a range of instants to the inclusive Between", () => {
    expect(at(seen, { op: "before", at: "2026-10-01T04:00:00Z" })).toEqual({ LastSeen: { Lt: "2026-10-01T04:00:00Z" } })
    expect(at(seen, { op: "between", start: "2026-10-01T00:00:00Z", end: "2026-10-02T00:00:00+11:00" })).toEqual({
      LastSeen: { Between: { Start: "2026-10-01T00:00:00Z", End: "2026-10-01T13:00:00Z" } },
    })
  })
  it("uses IsNull for emptiness", () => {
    expect(at(seen, { op: "isEmpty" })).toEqual({ LastSeen: { IsNull: true } })
    expect(at(seen, { op: "isNotEmpty" })).toEqual({ LastSeen: { IsNull: false } })
  })

  const changed = filters.date({ field: "ChangedAtEpoch", storage: "epoch-seconds" })
  it("sends epoch seconds through an IntFilter", () => {
    expect(at(changed, { op: "today" })).toEqual({ ChangedAtEpoch: { Gte: epoch(2026, 9, 12, 13), Lt: epoch(2026, 9, 13, 13) } })
    expect(at(changed, { op: "last24h" })).toEqual({ ChangedAtEpoch: { Gte: epoch(2026, 9, 11, 23, 30, 15) } })
    expect(at(changed, { op: "olderThan", days: 30 })).toEqual({ ChangedAtEpoch: { Lt: epoch(2026, 8, 12, 14) } })
    expect(at(changed, { op: "between", start: "2026-10-01", end: "2026-10-05" })).toEqual({
      ChangedAtEpoch: { Gte: epoch(2026, 8, 30, 14), Lt: epoch(2026, 9, 5, 13) },
    })
    expect(at(changed, { op: "between", start: "2026-10-01T00:00:00Z", end: "2026-10-01T01:00:00Z" })).toEqual({
      ChangedAtEpoch: { Gte: epoch(2026, 9, 1), Lte: epoch(2026, 9, 1, 1) },
    })
  })

  const due = filters.date({ field: "DueOn", storage: "calendar-date" })
  it("uses the calendar predicates only for calendar dates", () => {
    expect(at(due, { op: "today" })).toEqual({ DueOn: { IsToday: true } })
    expect(at(due, { op: "recent", days: 7 })).toEqual({ DueOn: { RecentDays: 7 } })
    expect(at(due, { op: "olderThan", days: 30 })).toEqual({ DueOn: { LteRelative: { Days: -31 } } })
    expect(at(due, { op: "future" })).toEqual({ DueOn: { InFuture: true } })
    expect(at(due, { op: "before", at: "2026-10-01" })).toEqual({ DueOn: { Lt: "2026-10-01" } })
    expect(at(due, { op: "after", at: "2026-10-01" })).toEqual({ DueOn: { Gte: "2026-10-01" } })
    expect(at(due, { op: "between", start: "2026-10-01", end: "2026-10-05" })).toEqual({ DueOn: { Between: { Start: "2026-10-01", End: "2026-10-05" } } })
    expect(at(due, { op: "last24h" })).toBeNull()
    expect(due.presets.some((preset) => preset.op === "last24h")).toBe(false)
  })
})

describe("boolean, options and uuid", () => {
  it("boolean → BoolFilter", () => {
    const online = filters.boolean({ field: "Online", labels: { true: "Online", false: "Offline" } })
    expect(at(online, { op: "eq", value: true })).toEqual({ Online: { Eq: true } })
    expect(at(online, { op: "eq", value: false })).toEqual({ Online: { Eq: false } })
    expect(at(online, { op: "isEmpty" })).toEqual({ Online: { IsNull: true } })
  })

  it("options → InList / NotIn on String, Int and Uuid filters", () => {
    const os = filters.options({ field: "Os", options: [] })
    expect(at(os, { op: "in", values: ["Windows 11 Pro", "macOS 15"] })).toEqual({ Os: { InList: ["Windows 11 Pro", "macOS 15"] } })
    expect(at(os, { op: "notIn", values: ["Windows 10 Pro"] })).toEqual({ Os: { NotIn: ["Windows 10 Pro"] } })
    expect(at(os, { op: "isEmpty" })).toEqual({ Or: [{ Os: { IsNull: true } }, { Os: { Eq: "" } }] })
    const tier = filters.options({ field: "Tier", server: "int", options: [] })
    expect(at(tier, { op: "in", values: ["1", "3"] })).toEqual({ Tier: { InList: [1, 3] } })
    expect(at(tier, { op: "isNotEmpty" })).toEqual({ Tier: { IsNull: false } })
  })

  it("options on a DecimalFilter use Or of Eq and And of Ne (no lists)", () => {
    const rate = filters.options({ field: "Rate", server: "decimal", options: [] })
    expect(at(rate, { op: "in", values: ["0.5", "1.25"] })).toEqual({ Or: [{ Rate: { Eq: "0.5" } }, { Rate: { Eq: "1.25" } }] })
    expect(at(rate, { op: "notIn", values: ["0.5"] })).toEqual({ And: [{ Rate: { Ne: "0.5" } }] })
  })

  it("uuid → UuidFilter", () => {
    const org = filters.uuid({ field: "OrganisationId" })
    const id = "5b16387d-8a01-5125-8c20-58511e60c6e3"
    expect(at(org, { op: "eq", value: id })).toEqual({ OrganisationId: { Eq: id } })
    expect(at(org, { op: "ne", value: id })).toEqual({ OrganisationId: { Ne: id } })
    expect(at(org, { op: "in", values: [id] })).toEqual({ OrganisationId: { InList: [id] } })
    expect(at(org, { op: "notIn", values: [id] })).toEqual({ OrganisationId: { NotIn: [id] } })
    expect(at(org, { op: "isEmpty" })).toEqual({ OrganisationId: { IsNull: true } })
  })
})

describe("toWhere", () => {
  const columns: FilterColumn[] = [
    { id: "hostname", header: "Endpoint", spec: filters.text({ field: "Hostname" }) },
    { id: "os", header: "OS", spec: filters.options({ field: "Os", options: [] }) },
    { id: "memory", header: "Memory", spec: filters.number({ field: "MemoryUsed", server: "decimal", unit: "%", scale: 0.01 }) },
    { id: "seen", header: "Last seen", spec: filters.date({ field: "LastSeen", storage: "rfc3339" }) },
  ]

  it("is undefined without filters, and ignores columns it does not know", () => {
    expect(toWhere([], columns)).toBeUndefined()
    expect(toWhere([{ id: "nope", value: { op: "eq", value: "x" } }], columns)).toBeUndefined()
  })

  it("gives each column its own And entry, in column order", () => {
    const where = toWhere(
      [
        { id: "seen", value: { op: "olderThan", days: 30 } },
        { id: "memory", value: { op: "gt", value: 50 } },
        { id: "os", value: { op: "in", values: ["Windows 11 Pro"] } },
      ],
      columns,
      { now: now() }
    )
    expect(where).toEqual({
      And: [{ Os: { InList: ["Windows 11 Pro"] } }, { MemoryUsed: { Gt: "0.5" } }, { LastSeen: { Lt: "2026-09-12T14:00:00Z" } }],
    })
  })

  it("lets a column write a hand-written input, and merges those with toFilterInput", () => {
    const handWritten: FilterColumn[] = [
      { id: "hostname", header: "Endpoint", spec: filters.text({ field: "Hostname", operators: ["contains"], toWhere: (value) => ("value" in value ? { HostnameContains: value.value } : null) }) },
      {
        id: "contact",
        header: "Last contact",
        spec: filters.date({ field: "SampleLastContact", storage: "rfc3339", toWhere: (value) => (value.op === "olderThan" ? { SampleLastContactOlderThanDays: value.days } : null) }),
      },
      {
        id: "provider",
        header: "Provider",
        spec: filters.custom<string[]>({
          editor: () => null,
          summary: (value, label) => `${label}: ${value.join(", ")}`,
          encode: (value) => value.join(","),
          decode: (raw) => raw.split(","),
          toWhere: (value) => ({ Providers: value }),
        }),
      },
    ]
    const state = [
      { id: "hostname", value: { op: "contains", value: "orb" } },
      { id: "contact", value: { op: "olderThan", days: 30 } },
      { id: "provider", value: ["SAMPLE", "ARCHIVE"] },
    ]
    expect(toFilterInput(state, handWritten)).toEqual({ HostnameContains: "orb", SampleLastContactOlderThanDays: 30, Providers: ["SAMPLE", "ARCHIVE"] })
    expect(toWhere(state.slice(0, 1), handWritten)).toEqual({ And: [{ HostnameContains: "orb" }] })
    // A preset the input cannot express sends nothing for that column.
    expect(toFilterInput([{ id: "contact", value: { op: "today" } }], handWritten)).toEqual({})
  })

  it("formats instants as UTC seconds", () => {
    expect(utc(2026, 9, 12, 13)).toBe("2026-10-12T13:00:00Z")
  })
})

describe("search → Or of Contains (R16.8)", () => {
  const columns: FilterColumn[] = [
    { id: "name", header: "Device", spec: filters.text({ field: "Name" }) },
    { id: "serial", header: "Serial", spec: filters.text({ field: "Serial" }) },
    { id: "os", header: "OS", spec: filters.options({ field: "Os", options: [] }) },
    { id: "seen", header: "Last seen", spec: filters.date({ field: "LastSeen", storage: "rfc3339" }) },
  ]
  const spec: DataTableSearch = { fields: ["name", "serial", { field: "SignedInUser" }] }

  it("matches the query against every identifying field, any one enough", () => {
    expect(searchWhere("orb-7", spec, columns)).toEqual({
      Or: [{ Name: { Contains: "orb-7" } }, { Serial: { Contains: "orb-7" } }, { SignedInUser: { Contains: "orb-7" } }],
    })
  })

  it("sends the query trimmed, and nothing for an empty one", () => {
    expect(searchWhere("  orb  ", spec, columns)).toEqual({ Or: [{ Name: { Contains: "orb" } }, { Serial: { Contains: "orb" } }, { SignedInUser: { Contains: "orb" } }] })
    expect(searchWhere("", spec, columns)).toBeNull()
    expect(searchWhere("   ", spec, columns)).toBeNull()
    expect(searchWhere(undefined, spec, columns)).toBeNull()
    expect(searchWhere("orb", undefined, columns)).toBeNull()
  })

  it("skips columns the set does not have, and repeats no field", () => {
    expect(searchWhere("x", { fields: ["name", "user", "name", { field: "Name" }] }, columns)).toEqual({ Or: [{ Name: { Contains: "x" } }] })
    expect(searchWhere("x", { fields: ["user"] }, columns)).toBeNull()
  })

  it("combines with the column filters under And, the search first", () => {
    const where = toWhere(
      [
        { id: "seen", value: { op: "olderThan", days: 30 } },
        { id: "os", value: { op: "in", values: ["Windows 11 Pro"] } },
      ],
      columns,
      { now: now(), search: { query: "nst", spec } }
    )
    expect(where).toEqual({
      And: [
        { Or: [{ Name: { Contains: "nst" } }, { Serial: { Contains: "nst" } }, { SignedInUser: { Contains: "nst" } }] },
        { Os: { InList: ["Windows 11 Pro"] } },
        { LastSeen: { Lt: "2026-09-12T14:00:00Z" } },
      ],
    })
  })

  it("searches alone, and leaves the Where undefined with neither", () => {
    expect(toWhere([], columns, { search: { query: "orb", spec: { fields: ["name"] } } })).toEqual({ And: [{ Or: [{ Name: { Contains: "orb" } }] }] })
    expect(toWhere([], columns, { search: { query: "", spec } })).toBeUndefined()
  })

  it("takes the search's own mapping: a hand-written input, or nothing for a search resolver", () => {
    const handWritten: DataTableSearch = { fields: [], toWhere: (query) => ({ HostnameContains: query }) }
    expect(toFilterInput([{ id: "os", value: { op: "in", values: ["macOS 15"] } }], columns, { search: { query: " orb ", spec: handWritten } })).toEqual({
      HostnameContains: "orb",
      Os: { InList: ["macOS 15"] },
    })
    const resolver: DataTableSearch = { fields: ["name"], toWhere: () => null }
    expect(toWhere([], columns, { search: { query: "orb", spec: resolver } })).toBeUndefined()
  })
})
