/**
 * Table filters → graphql-orm `Where` inputs (docs/data-filters.md §3.4). Pure: give it the
 * table's filter state and its columns, get the object to send as `Where`.
 *
 *   const where = toWhere(state.filters, columns)          // { And: [{ Os: { InList: [...] } }, …] }
 *   client.query({ query: DEVICES, variables: { Where: where, OrderBy, Page } })
 *
 * One `And` entry per column, so two filters on one field never overwrite each other.
 * Date presets are computed from the user's local day at call time and sent as UTC bounds:
 * call it on every fetch so a live table's "last 7 days" keeps rolling.
 *
 * Hand-written inputs (`EndpointFilterInput { HostnameContains }`) have no `And`: give
 * each column a `toWhere` and merge the entries with `toFilterInput`.
 *
 * The toolbar search (R16.8) is one more `And` entry, first: an `Or` of `Contains` across the
 * table's identifying fields (`searchWhere`), or the search's own `toWhere`.
 *
 *   toWhere(state.filters, columns, { search: { query: state.search, spec: DEVICE_SEARCH } })
 *   // { And: [{ Or: [{ Name: { Contains: "orb" } }, { Serial: { Contains: "orb" } }] }, { Os: { InList: [...] } }] }
 */
import type { ColumnFiltersState, RowData } from "@tanstack/react-table"
import type { DataTableColumn } from "../../ui/data-table/columns.js"
import { asFilterColumns } from "../../ui/data-table/filters/columns.js"
import { searchFields } from "../../ui/data-table/search/match.js"
import { normalizeSearch, type DataTableSearch } from "../../ui/data-table/search/types.js"
import { numberComparisons, tidyNumber, timeBounds, type TimeBounds } from "../../ui/data-table/filters/semantics.js"
import type {
  BooleanFilterValue,
  CompareOp,
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
  WhereInput,
} from "../../ui/data-table/filters/types.js"

export type { WhereInput }

export interface WhereOptions {
  /** "Now" for date presets (default: the moment of the call). */
  now?: Date
  /**
   * The toolbar search: the query (`state.search`) and the table's search config (the same
   * object the table's `search` prop takes). An empty query sends nothing.
   */
  // oxlint-disable-next-line typescript/no-explicit-any -- any row type: only the fields are read
  search?: { query: string | undefined; spec: DataTableSearch<any> | undefined }
}

const PASCAL: Record<CompareOp, string> = { eq: "Eq", ne: "Ne", gt: "Gt", gte: "Gte", lt: "Lt", lte: "Lte" }

const on = (field: string, filter: Record<string, unknown>): WhereInput => ({ [field]: filter })

/** A Decimal as exact text: rust_decimal parses strings without float error. */
export function decimalText(value: number): string {
  const text = String(tidyNumber(value))
  if (!/e/i.test(text)) return text
  return tidyNumber(value).toFixed(20).replace(/\.?0+$/, "")
}

/** `2026-10-12T13:00:00Z`: UTC, whole seconds, the form graphql-orm timestamps are stored in. */
export function rfc3339(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z")
}

function emptyString(field: string, empty: boolean): WhereInput {
  // A string column is empty when it is NULL or "".
  return empty
    ? { Or: [on(field, { IsNull: true }), on(field, { Eq: "" })] }
    : { And: [on(field, { IsNull: false }), on(field, { Ne: "" })] }
}

function textWhere(field: string, value: TextFilterValue): WhereInput {
  switch (value.op) {
    case "contains":
      return on(field, { Contains: value.value })
    case "startsWith":
      return on(field, { StartsWith: value.value })
    case "endsWith":
      return on(field, { EndsWith: value.value })
    case "eq":
      return on(field, { Eq: value.value })
    case "ne":
      return on(field, { Ne: value.value })
    case "in":
      return on(field, { InList: value.values })
    case "notIn":
      return on(field, { NotIn: value.values })
    case "isEmpty":
      return emptyString(field, true)
    case "isNotEmpty":
      return emptyString(field, false)
  }
}

function numberWhere(field: string, value: NumberFilterValue, spec: NumberFilterSpec): WhereInput {
  if (value.op === "isEmpty" || value.op === "isNotEmpty") return on(field, { IsNull: value.op === "isEmpty" })
  const filter: Record<string, unknown> = {}
  for (const [op, stored] of numberComparisons(value, spec)) filter[PASCAL[op]] = spec.server === "decimal" ? decimalText(stored) : stored
  return on(field, filter)
}

function boundsFilter(bounds: TimeBounds, format: (ms: number) => string | number, between: boolean): Record<string, unknown> {
  // A closed range of instants is DateFilter's inclusive Between (IntFilter has none).
  if (between && bounds.gte !== undefined && bounds.lte !== undefined) {
    return { Between: { Start: format(bounds.gte), End: format(bounds.lte) } }
  }
  const filter: Record<string, unknown> = {}
  if (bounds.gte !== undefined) filter.Gte = format(bounds.gte)
  if (bounds.gt !== undefined) filter.Gt = format(bounds.gt)
  if (bounds.lt !== undefined) filter.Lt = format(bounds.lt)
  if (bounds.lte !== undefined) filter.Lte = format(bounds.lte)
  return filter
}

function calendarWhere(field: string, value: Exclude<DateFilterValue, { op: "isEmpty" | "isNotEmpty" | "last24h" }>): WhereInput {
  switch (value.op) {
    case "today":
      return on(field, { IsToday: true })
    case "recent":
      return on(field, { RecentDays: value.days })
    case "olderThan":
      // LteRelative { Days: d } selects days on or before today + d.
      return on(field, { LteRelative: { Days: -(value.days + 1) } })
    case "future":
      return on(field, { InFuture: true })
    case "between":
      return on(field, { Between: { Start: value.start.slice(0, 10), End: value.end.slice(0, 10) } })
    case "before":
      return on(field, { Lt: value.at.slice(0, 10) })
    case "after":
      return on(field, { Gte: value.at.slice(0, 10) })
  }
}

function dateWhere(field: string, value: DateFilterValue, spec: DateFilterSpec, context: FilterTimeContext): WhereInput | null {
  if (value.op === "isEmpty" || value.op === "isNotEmpty") return on(field, { IsNull: value.op === "isEmpty" })
  if (spec.storage === "calendar-date") return value.op === "last24h" ? null : calendarWhere(field, value)
  const bounds = timeBounds(value, context.now)
  return spec.storage === "epoch-seconds" ? on(field, boundsFilter(bounds, (ms) => Math.floor(ms / 1000), false)) : on(field, boundsFilter(bounds, rfc3339, true))
}

function booleanWhere(field: string, value: BooleanFilterValue): WhereInput {
  if (value.op === "eq") return on(field, { Eq: value.value })
  return on(field, { IsNull: value.op === "isEmpty" })
}

function optionsWhere(field: string, value: OptionsFilterValue, spec: OptionsFilterSpec): WhereInput {
  if (value.op === "isEmpty" || value.op === "isNotEmpty") {
    return spec.server === "string" ? emptyString(field, value.op === "isEmpty") : on(field, { IsNull: value.op === "isEmpty" })
  }
  if (spec.server === "decimal") {
    // DecimalFilter has no lists: any of = Or of Eq; none of = And of Ne.
    const values = value.values.map((entry) => decimalText(Number(entry)))
    return value.op === "in" ? { Or: values.map((entry) => on(field, { Eq: entry })) } : { And: values.map((entry) => on(field, { Ne: entry })) }
  }
  const values = spec.server === "int" ? value.values.map(Number) : value.values
  return on(field, value.op === "in" ? { InList: values } : { NotIn: values })
}

function uuidWhere(field: string, value: UuidFilterValue): WhereInput {
  switch (value.op) {
    case "eq":
      return on(field, { Eq: value.value })
    case "ne":
      return on(field, { Ne: value.value })
    case "in":
      return on(field, { InList: value.values })
    case "notIn":
      return on(field, { NotIn: value.values })
    default:
      return on(field, { IsNull: value.op === "isEmpty" })
  }
}

/** One column's entry in the `And` list, or null to send nothing for it. */
export function columnWhere(spec: FilterSpec, value: unknown, context: FilterTimeContext): WhereInput | null {
  if (spec.kind === "custom") return spec.toWhere(value, context)
  if (spec.toWhere) return (spec.toWhere as (value: unknown, context: FilterTimeContext) => WhereInput | null)(value, context)
  switch (spec.kind) {
    case "text":
      return textWhere(spec.field, value as TextFilterValue)
    case "number":
      return numberWhere(spec.field, value as NumberFilterValue, spec)
    case "date":
      return dateWhere(spec.field, value as DateFilterValue, spec, context)
    case "boolean":
      return booleanWhere(spec.field, value as BooleanFilterValue)
    case "options":
      return optionsWhere(spec.field, value as OptionsFilterValue, spec)
    case "uuid":
      return uuidWhere(spec.field, value as UuidFilterValue)
  }
}

type Columns<T extends RowData> = readonly DataTableColumn<T>[] | readonly FilterColumn[]

/**
 * The toolbar search's entry (docs/data-filters.md §8): `{ Or: [{ Name: { Contains: q } }, …] }`
 * across the search's fields (`Contains` ignores case on the server), or the search's own
 * `toWhere`. Null for an empty query, or when no field resolves.
 */
export function searchWhere<T extends RowData>(query: string | undefined, spec: DataTableSearch<T> | undefined, columns: Columns<T> = []): WhereInput | null {
  const needle = normalizeSearch(query)
  if (!needle || !spec) return null
  if (spec.toWhere) return spec.toWhere(needle)
  const fields = searchFields(spec, columns)
  return fields.length ? { Or: fields.map(({ field }) => on(field, { Contains: needle })) } : null
}

function searchEntry<T extends RowData>(columns: Columns<T>, options: WhereOptions): WhereInput[] {
  const entry = options.search ? searchWhere(options.search.query, options.search.spec, columns) : null
  return entry ? [entry] : []
}

/** Each filtered column's entry, in column order (so equal filters make equal queries). */
export function columnEntries<T extends RowData>(filters: ColumnFiltersState, columns: Columns<T>, options: WhereOptions = {}): WhereInput[] {
  const context = { now: options.now ?? new Date() }
  const byId = new Map(filters.map((filter) => [filter.id, filter.value]))
  return asFilterColumns(columns).flatMap((column) => {
    if (!byId.has(column.id)) return []
    const entry = columnWhere(column.spec, byId.get(column.id), context)
    return entry ? [entry] : []
  })
}

/**
 * The `Where` for a generated graphql-orm list: `{ And: [ search?, …one entry per filtered
 * column… ] }`, or undefined when nothing is searched or filtered.
 */
export function toWhere<T extends RowData>(filters: ColumnFiltersState, columns: Columns<T>, options: WhereOptions = {}): WhereInput | undefined {
  const entries = [...searchEntry(columns, options), ...columnEntries(filters, columns, options)]
  return entries.length ? { And: entries } : undefined
}

/**
 * For hand-written filter inputs (no `And`): each column's `toWhere` entry merged into one
 * object, e.g. `{ HostnameContains: "orb", Providers: ["SAMPLE"] }`. A search merges in its
 * own `toWhere` entry (give the search one; the default `Or` needs a generated list).
 */
export function toFilterInput<T extends RowData>(filters: ColumnFiltersState, columns: Columns<T>, options: WhereOptions = {}): WhereInput {
  return Object.assign({}, ...searchEntry(columns, options), ...columnEntries(filters, columns, options)) as WhereInput
}
