/**
 * `matches` (local data) must select exactly the rows the server would: every filter
 * below runs through `toWhere`, is evaluated by the in-memory graphql-orm evaluator, and
 * is compared row by row with `matchesFilter` on the same fixtures.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { filters } from "../../ui/data-table/filters/kinds.js"
import { filterRows, matchesFilter } from "../../ui/data-table/filters/match.js"
import { matchesSearch, searchRows } from "../../ui/data-table/search/match.js"
import type { DataTableSearch } from "../../ui/data-table/search/types.js"
import type { FilterColumn } from "../../ui/data-table/filters/types.js"
import { toIsoDate } from "../../ui/date-picker/calendar-date.js"
import { evaluateWhere } from "./evaluate.js"
import { rfc3339, toWhere } from "./where.js"

const previousTz = process.env.TZ
beforeAll(() => {
  process.env.TZ = "Australia/Hobart"
})
afterAll(() => {
  process.env.TZ = previousTz
})

const NOW = "2026-10-13T10:30:15.500+11:00"
const DAY = 86_400_000

interface Row {
  hostname: string | null
  os: string | null
  tier: number | null
  rate: number | null
  memory: number | null
  loss: number | null
  online: boolean | null
  org: string | null
  seen: number | null
  dueOn: string | null
}

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ORG_A = "5b16387d-8a01-5125-8c20-58511e60c6e3"
const ORG_B = "d800649f-88b6-5115-943b-cd0de107fc46"

/** Rows around every boundary the filters draw: midnights, ±1 s, DST, null and "". */
function fixtures(now: Date): Row[] {
  const random = mulberry32(99)
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)] as T
  const midnight = (offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset).getTime()
  const times = [
    midnight(0),
    midnight(0) - 1000,
    midnight(1),
    midnight(1) - 1000,
    midnight(-6),
    midnight(-6) - 1000,
    midnight(-29),
    midnight(-29) - 1000,
    midnight(-30),
    midnight(-30) - 1000,
    midnight(-90),
    now.getTime() - DAY,
    now.getTime() - DAY - 1000,
    now.getTime() + 60_000,
    now.getTime() - 500,
    Date.UTC(2026, 9, 3, 15, 30),
    Date.UTC(2026, 8, 30, 14),
  ]
  const rows: Row[] = []
  for (let index = 0; index < 120; index++) {
    const time = index < times.length ? times[index]! : now.getTime() - Math.floor(random() * 200) * DAY - Math.floor(random() * DAY)
    rows.push({
      hostname: pick(["NST-C106", "nst-c106", "LMN-4E5E", "orb-0001", "STUDIO-VM", "", null, "NST-L200", "50%_off"]),
      os: pick(["Windows 11 Pro", "Windows 10 Pro", "macOS 15", "", null]),
      tier: pick([1, 2, 3, null]),
      rate: pick([0.5, 1.25, 2, null]),
      memory: pick([0, 0.2, 0.5, 0.57, 0.8, 0.999, null]),
      loss: pick([0, 25, 26, 30, 31, null]),
      online: pick([true, false, null]),
      org: pick([ORG_A, ORG_A.toUpperCase(), ORG_B, null]),
      seen: index % 23 === 0 ? null : Math.floor(time / 1000) * 1000,
      dueOn: index % 19 === 0 ? null : toIsoDate(new Date(time)),
    })
  }
  return rows
}

const columns: Array<FilterColumn & { getValue: (row: Row) => unknown }> = [
  { id: "hostname", header: "Endpoint", spec: filters.text({ field: "Hostname" }), getValue: (row) => row.hostname },
  { id: "os", header: "OS", spec: filters.options({ field: "Os", options: [] }), getValue: (row) => row.os },
  { id: "tier", header: "Tier", spec: filters.options({ field: "Tier", server: "int", options: [] }), getValue: (row) => row.tier },
  { id: "rate", header: "Rate", spec: filters.options({ field: "Rate", server: "decimal", options: [] }), getValue: (row) => row.rate },
  { id: "memory", header: "Memory", spec: filters.number({ field: "MemoryUsed", server: "decimal", unit: "%", scale: 0.01 }), getValue: (row) => row.memory },
  { id: "loss", header: "Loss", spec: filters.number({ field: "LossPermille", server: "int", unit: "%", scale: 10 }), getValue: (row) => row.loss },
  { id: "online", header: "Online", spec: filters.boolean({ field: "Online", labels: { true: "Online", false: "Offline", empty: "Unknown" } }), getValue: (row) => row.online },
  { id: "org", header: "Organisation", spec: filters.uuid({ field: "OrganisationId" }), getValue: (row) => row.org },
  { id: "seenText", header: "Last seen", spec: filters.date({ field: "LastSeen", storage: "rfc3339" }), getValue: (row) => (row.seen === null ? null : rfc3339(row.seen)) },
  { id: "seenEpoch", header: "Last seen", spec: filters.date({ field: "LastSeenEpoch", storage: "epoch-seconds" }), getValue: (row) => (row.seen === null ? null : row.seen / 1000) },
  { id: "dueOn", header: "Due", spec: filters.date({ field: "DueOn", storage: "calendar-date" }), getValue: (row) => row.dueOn },
]

function record(row: Row): Record<string, unknown> {
  return Object.fromEntries(columns.map((column) => [column.spec.field, column.getValue(row)]))
}

const DATE_VALUES = [
  { op: "today" },
  { op: "last24h" },
  { op: "recent", days: 1 },
  { op: "recent", days: 7 },
  { op: "recent", days: 30 },
  { op: "olderThan", days: 30 },
  { op: "olderThan", days: 90 },
  { op: "future" },
  { op: "before", at: "2026-10-04" },
  { op: "after", at: "2026-10-04" },
  { op: "between", start: "2026-09-14", end: "2026-10-06" },
  { op: "between", start: "2026-10-03T00:00:00Z", end: "2026-10-12T13:00:00Z" },
  { op: "isEmpty" },
  { op: "isNotEmpty" },
]

const CASES: Record<string, unknown[]> = {
  hostname: [
    { op: "contains", value: "nst" },
    { op: "contains", value: "%_" },
    { op: "startsWith", value: "ORB" },
    { op: "endsWith", value: "-VM" },
    { op: "eq", value: "NST-C106" },
    { op: "ne", value: "NST-C106" },
    { op: "in", values: ["NST-C106", "STUDIO-VM"] },
    { op: "notIn", values: ["NST-C106", ""] },
    { op: "isEmpty" },
    { op: "isNotEmpty" },
  ],
  os: [{ op: "in", values: ["Windows 11 Pro", "macOS 15"] }, { op: "notIn", values: ["Windows 10 Pro"] }, { op: "isEmpty" }, { op: "isNotEmpty" }],
  tier: [{ op: "in", values: ["1", "3"] }, { op: "notIn", values: ["2"] }, { op: "isEmpty" }],
  rate: [{ op: "in", values: ["0.5", "2"] }, { op: "notIn", values: ["1.25"] }, { op: "isNotEmpty" }],
  memory: [
    { op: "gt", value: 50 },
    { op: "gte", value: 57 },
    { op: "lt", value: 20 },
    { op: "lte", value: 57 },
    { op: "eq", value: 57 },
    { op: "ne", value: 0 },
    { op: "between", min: 20, max: 80 },
    { op: "isEmpty" },
  ],
  loss: [
    { op: "gt", value: 2.55 },
    { op: "gte", value: 2.55 },
    { op: "lt", value: 2.55 },
    { op: "lte", value: 2.55 },
    { op: "eq", value: 2.55 },
    { op: "ne", value: 3 },
    { op: "between", min: 2.55, max: 3.01 },
    { op: "isNotEmpty" },
  ],
  online: [{ op: "eq", value: true }, { op: "eq", value: false }, { op: "isEmpty" }, { op: "isNotEmpty" }],
  org: [
    { op: "eq", value: ORG_A },
    { op: "ne", value: ORG_A },
    { op: "in", values: [ORG_A, ORG_B] },
    { op: "notIn", values: [ORG_B] },
    { op: "isEmpty" },
  ],
  seenText: DATE_VALUES,
  seenEpoch: DATE_VALUES,
  dueOn: DATE_VALUES.filter((value) => value.op !== "last24h" && !("start" in value && String(value.start).includes("T"))),
}

describe("matches agrees with the server", () => {
  const now = () => new Date(NOW)
  for (const column of columns) {
    for (const value of CASES[column.id] ?? []) {
      it(`${column.id} ${JSON.stringify(value)}`, () => {
        const context = { now: now() }
        const where = toWhere([{ id: column.id, value }], columns, context)
        expect(where).toBeDefined()
        const rows = fixtures(context.now)
        const local = rows.map((row) => matchesFilter(column.spec, column.getValue(row), value, context))
        const server = rows.map((row) => evaluateWhere(where, record(row), { today: toIsoDate(context.now) }))
        expect(local).toEqual(server)
        // Every case selects something and leaves something out, so it tests a boundary.
        expect(local.some(Boolean) || value === undefined).toBe(true)
      })
    }
  }
})

describe("search agrees with the server", () => {
  const now = () => new Date(NOW)
  // Two columns by id, and a field that is not a column (the organisation, read from the row).
  const spec: DataTableSearch<Row> = { fields: ["hostname", "os", { field: "Org", value: (row) => row.org }] }
  const searchRecord = (row: Row) => ({ ...record(row), Org: row.org })
  const QUERIES = ["nst", "NST-C1", "orb", "%_", "_", "-vm", "windows 1", "0b9f", "MACOS", "  win11  ", "zzz"]

  for (const query of QUERIES) {
    it(`"${query}"`, () => {
      const where = toWhere([], columns, { search: { query, spec } })
      const rows = fixtures(now())
      const local = rows.map((row) => matchesSearch(row, query, spec, columns))
      const server = rows.map((row) => evaluateWhere(where, searchRecord(row)))
      expect(local).toEqual(server)
    })
  }

  it("matches every row for an empty query, as the server with no Where", () => {
    const rows = fixtures(now())
    expect(toWhere([], columns, { search: { query: "  ", spec } })).toBeUndefined()
    expect(searchRows(rows, "  ", spec, columns)).toEqual(rows)
  })

  it("narrows with the column filters: both must hold", () => {
    const context = { now: now() }
    const rows = fixtures(context.now)
    const applied = [
      { id: "online", value: { op: "eq", value: true } },
      { id: "seenEpoch", value: { op: "recent", days: 30 } },
    ]
    for (const query of ["nst", "windows", "orb"]) {
      const where = toWhere(applied, columns, { ...context, search: { query, spec } })
      const server = rows.filter((row) => evaluateWhere(where, searchRecord(row), { today: toIsoDate(context.now) }))
      const local = searchRows(filterRows(rows, applied, columns, context), query, spec, columns)
      expect(local).toEqual(server)
      expect(server.length).toBeGreaterThan(0)
      expect(server.length).toBeLessThan(rows.length)
    }
  })

  it("follows a custom mapping's own matches", () => {
    const prefix: DataTableSearch<Row> = {
      fields: [],
      toWhere: (query) => ({ Hostname: { StartsWith: query } }),
      matches: (row, query) => row.hostname !== null && row.hostname.toLowerCase().startsWith(query.toLowerCase()),
    }
    const rows = fixtures(now())
    const where = toWhere([], columns, { search: { query: "nst", spec: prefix } })
    expect(rows.map((row) => matchesSearch(row, "nst", prefix, columns))).toEqual(rows.map((row) => evaluateWhere(where, record(row))))
  })
})
