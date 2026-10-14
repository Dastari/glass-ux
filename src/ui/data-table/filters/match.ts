/**
 * Local matching with the server's semantics (docs/data-filters.md §3.5). Only for a
 * result that is fully loaded and never paged — an AI result table, a settings list —
 * because filtering one page in the browser silently hides rows on the others.
 *
 * SQL NULL rules apply: an empty value (null or undefined) fails every comparison,
 * including "is not" and "is none of"; only "is empty" selects it. Text "contains",
 * "starts with" and "ends with" ignore case; "is", "is not" and lists are exact.
 */
import type { ColumnFiltersState } from "@tanstack/react-table"
import { toIsoDate, type IsoDate } from "../../date-picker/calendar-date.js"
import { compare, dayBounds, instantOf, numberComparisons, timeBounds, type DayBounds, type TimeBounds } from "./semantics.js"
import type {
  BooleanFilterValue,
  DateFilterSpec,
  DateFilterValue,
  FilterColumn,
  FilterSpec,
  FilterTimeContext,
  NumberFilterSpec,
  NumberFilterValue,
  OptionsFilterSpec,
  OptionsFilterValue,
  TextFilterValue,
  UuidFilterValue,
} from "./types.js"

const isNull = (value: unknown) => value === null || value === undefined || (typeof value === "number" && Number.isNaN(value))

function text(cell: unknown): string | null {
  if (isNull(cell)) return null
  return typeof cell === "string" ? cell : String(cell)
}

export function matchesText(cell: unknown, filter: TextFilterValue): boolean {
  const value = text(cell)
  switch (filter.op) {
    case "isEmpty":
      return value === null || value === ""
    case "isNotEmpty":
      return value !== null && value !== ""
  }
  if (value === null) return false
  switch (filter.op) {
    case "contains":
      return value.toLowerCase().includes(filter.value.toLowerCase())
    case "startsWith":
      return value.toLowerCase().startsWith(filter.value.toLowerCase())
    case "endsWith":
      return value.toLowerCase().endsWith(filter.value.toLowerCase())
    case "eq":
      return value === filter.value
    case "ne":
      return value !== filter.value
    case "in":
      return filter.values.includes(value)
    case "notIn":
      return !filter.values.includes(value)
  }
}

export function matchesNumber(cell: unknown, filter: NumberFilterValue, spec: Pick<NumberFilterSpec, "scale" | "server">): boolean {
  const value = typeof cell === "number" ? cell : typeof cell === "string" && cell.trim() !== "" ? Number(cell) : Number.NaN
  if (filter.op === "isEmpty") return isNull(cell) || Number.isNaN(value)
  if (filter.op === "isNotEmpty") return !isNull(cell) && !Number.isNaN(value)
  if (Number.isNaN(value)) return false
  return numberComparisons(filter, spec).every(([op, bound]) => compare(op, value, bound))
}

/** A cell's moment in epoch ms: Date, ms number (or seconds for epoch storage), or text. */
function cellTime(cell: unknown, storage: DateFilterSpec["storage"]): number {
  if (cell instanceof Date) return cell.getTime()
  if (typeof cell === "number") return storage === "epoch-seconds" ? cell * 1000 : cell
  if (typeof cell === "string") {
    const ms = instantOf(cell)
    return Number.isNaN(ms) ? Date.parse(cell) : ms
  }
  return Number.NaN
}

function cellDay(cell: unknown): IsoDate | null {
  if (cell instanceof Date) return toIsoDate(cell)
  if (typeof cell === "string" && /^\d{4}-\d{2}-\d{2}/.test(cell)) return cell.slice(0, 10)
  return null
}

const withinTime = (time: number, bounds: TimeBounds) =>
  (bounds.gte === undefined || time >= bounds.gte) &&
  (bounds.gt === undefined || time > bounds.gt) &&
  (bounds.lt === undefined || time < bounds.lt) &&
  (bounds.lte === undefined || time <= bounds.lte)

const withinDays = (day: IsoDate, bounds: DayBounds) =>
  (bounds.gte === undefined || day >= bounds.gte) && (bounds.lt === undefined || day < bounds.lt) && (bounds.lte === undefined || day <= bounds.lte)

export function matchesDate(cell: unknown, filter: DateFilterValue, spec: Pick<DateFilterSpec, "storage">, context: FilterTimeContext): boolean {
  if (filter.op === "isEmpty") return isNull(cell) || cell === ""
  if (filter.op === "isNotEmpty") return !isNull(cell) && cell !== ""
  if (spec.storage === "calendar-date") {
    if (filter.op === "last24h") return false
    const day = cellDay(cell)
    return day !== null && withinDays(day, dayBounds(filter, toIsoDate(context.now)))
  }
  const time = cellTime(cell, spec.storage)
  if (Number.isNaN(time)) return false
  // The server compares whole seconds (epoch seconds, or RFC 3339 without fractions).
  return withinTime(Math.floor(time / 1000) * 1000, timeBounds(filter, context.now))
}

export function matchesBoolean(cell: unknown, filter: BooleanFilterValue): boolean {
  if (filter.op === "isEmpty") return isNull(cell)
  if (filter.op === "isNotEmpty") return !isNull(cell)
  return typeof cell === "boolean" && cell === filter.value
}

/** How an options value compares on its server type. */
function optionKey(value: unknown, server: OptionsFilterSpec["server"]): string | number | null {
  if (isNull(value)) return null
  if (server === "int" || server === "decimal") {
    const number = typeof value === "number" ? value : Number(value)
    return Number.isNaN(number) ? null : number
  }
  const string = String(value)
  return server === "uuid" ? string.toLowerCase() : string
}

export function matchesOptions(cell: unknown, filter: OptionsFilterValue, spec: Pick<OptionsFilterSpec, "server">): boolean {
  if (filter.op === "isEmpty") return isNull(cell) || (spec.server === "string" && cell === "")
  if (filter.op === "isNotEmpty") return !isNull(cell) && !(spec.server === "string" && cell === "")
  const key = optionKey(cell, spec.server)
  if (key === null) return false
  const hit = filter.values.some((value) => optionKey(value, spec.server) === key)
  return filter.op === "in" ? hit : !hit
}

export function matchesUuid(cell: unknown, filter: UuidFilterValue): boolean {
  if (filter.op === "isEmpty") return isNull(cell)
  if (filter.op === "isNotEmpty") return !isNull(cell)
  if (isNull(cell)) return false
  const value = String(cell).toLowerCase()
  switch (filter.op) {
    case "eq":
      return value === filter.value.toLowerCase()
    case "ne":
      return value !== filter.value.toLowerCase()
    case "in":
      return filter.values.some((entry) => entry.toLowerCase() === value)
    case "notIn":
      return !filter.values.some((entry) => entry.toLowerCase() === value)
  }
}

/** Does a cell value pass a column's filter? The same rows the server would return. */
export function matchesFilter(spec: FilterSpec, cell: unknown, value: unknown, context: FilterTimeContext = { now: new Date() }): boolean {
  switch (spec.kind) {
    case "text":
      return matchesText(cell, value as TextFilterValue)
    case "number":
      return matchesNumber(cell, value as NumberFilterValue, spec)
    case "date":
      return matchesDate(cell, value as DateFilterValue, spec, context)
    case "boolean":
      return matchesBoolean(cell, value as BooleanFilterValue)
    case "options":
      return matchesOptions(cell, value as OptionsFilterValue, spec)
    case "uuid":
      return matchesUuid(cell, value as UuidFilterValue)
    case "custom":
      return spec.matches ? spec.matches(cell, value, context) : true
  }
}

/**
 * Filter a fully loaded list in the browser (never a paged one). Each column reads its
 * value with `getValue` (the column's accessor).
 */
export function filterRows<T>(
  rows: readonly T[],
  filters: ColumnFiltersState,
  columns: ReadonlyArray<FilterColumn & { getValue?: (row: T) => unknown }>,
  context: FilterTimeContext = { now: new Date() }
): T[] {
  const active = filters.flatMap((filter) => {
    const column = columns.find((entry) => entry.id === filter.id)
    return column?.getValue ? [{ column, getValue: column.getValue, value: filter.value }] : []
  })
  if (!active.length) return rows.slice()
  return rows.filter((row) => active.every(({ column, getValue, value }) => matchesFilter(column.spec, getValue(row), value, context)))
}
