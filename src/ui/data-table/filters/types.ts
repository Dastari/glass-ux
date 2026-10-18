/**
 * The column filter model (R16.7, docs/data-filters.md). A filter value is plain,
 * serialisable data whose shape depends on the column's kind; the column's `FilterSpec`
 * says how to edit it, summarise it, put it in the URL, test a value against it and send
 * it to the server. Nothing here knows about a particular backend: a server adapter (an
 * optional entry such as `glass-ux/adapters/graphql-orm`, or your own) reads these specs.
 */
import type { ComponentType } from "react"
import type { OptionItem, OptionSource } from "../../combobox/index.js"

export type FilterKind = "text" | "number" | "date" | "boolean" | "options" | "uuid" | "custom"

/* ── Values ──────────────────────────────────────────────────────────────────── */

export type EmptyOp = "isEmpty" | "isNotEmpty"
export type EmptyFilterValue = { op: "isEmpty" } | { op: "isNotEmpty" }
export type ListOp = "in" | "notIn"

export type TextValueOp = "contains" | "eq" | "ne" | "startsWith" | "endsWith"
export type TextOp = TextValueOp | ListOp | EmptyOp
export type TextFilterValue = { op: TextValueOp; value: string } | { op: ListOp; values: string[] } | EmptyFilterValue

export type CompareOp = "eq" | "ne" | "gt" | "gte" | "lt" | "lte"
export type NumberOp = CompareOp | "between" | EmptyOp
/** Numbers are in the unit the cell shows (`%`, `GB`); the spec's scale converts them. */
export type NumberFilterValue = { op: CompareOp; value: number } | { op: "between"; min: number; max: number } | EmptyFilterValue

/** Relative presets stay relative in the URL (`recent:7`), so a shared link keeps rolling. */
export type DatePresetValue = { op: "today" } | { op: "last24h" } | { op: "future" } | { op: "recent"; days: number } | { op: "olderThan"; days: number }
export type DatePresetOp = DatePresetValue["op"]
export type DateRangeOp = "before" | "after" | "between"
/**
 * `at`, `start` and `end` are calendar days (`2026-10-13`, the user's local day) or
 * RFC 3339 instants (`2026-10-13T04:00:00Z`). The editor writes days.
 */
export type DateFilterValue =
  | DatePresetValue
  | { op: "before" | "after"; at: string }
  | { op: "between"; start: string; end: string }
  | EmptyFilterValue
export type DateOp = DateFilterValue["op"]

export type BooleanFilterValue = { op: "eq"; value: boolean } | EmptyFilterValue
export type BooleanOp = BooleanFilterValue["op"]

export type OptionsOp = ListOp | EmptyOp
export type OptionsFilterValue = { op: ListOp; values: string[] } | EmptyFilterValue

export type UuidOp = "eq" | "ne" | ListOp | EmptyOp
export type UuidFilterValue = { op: "eq" | "ne"; value: string } | { op: ListOp; values: string[] } | EmptyFilterValue

/** Any built-in filter value, or a custom column's own JSON. */
export type FilterValue =
  | TextFilterValue
  | NumberFilterValue
  | DateFilterValue
  | BooleanFilterValue
  | OptionsFilterValue
  | UuidFilterValue
  | CustomFilterValue

/** A custom column's value: any JSON the column defines. */
export type CustomFilterValue = unknown

/* ── Server mapping inputs ───────────────────────────────────────────────────── */

/** One condition in the shape your server's query accepts (a JSON object). */
export type WhereInput = Record<string, unknown>

export interface FilterTimeContext {
  /** "Now" for presets. Recomputed on every query so a live window keeps rolling. */
  now: Date
}

/** How a column stores a point in time on the server. */
export type DateStorage =
  /** RFC 3339 UTC text (`2026-10-13T00:00:00Z`). */
  | "rfc3339"
  /** Whole seconds since the epoch, stored as an integer (`ChangedAtEpoch`). */
  | "epoch-seconds"
  /** A calendar date without a time (`2026-10-13`). Presets use the server's calendar predicates. */
  | "calendar-date"

/* ── Specs ───────────────────────────────────────────────────────────────────── */

interface FilterSpecBase<V> {
  /** The server field this column filters on, as the server names it (`Hostname`). */
  field: string
  /** Names the filter in chips and the editor. Defaults to the column header. */
  label?: string
  /** Offer "is empty" and "is not empty" (default true; boolean: false). */
  nullable: boolean
  /**
   * Hand-written server inputs: return this column's condition yourself (for example
   * `{ HostnameContains: "orb" }`), or null to send nothing.
   */
  toWhere?: (value: V, context: FilterTimeContext) => WhereInput | null
}

export interface TextFilterSpec extends FilterSpecBase<TextFilterValue> {
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: "text"
  /** Operators offered, in menu order. */
  operators: readonly TextOp[]
  placeholder?: string
}

export interface NumberFilterSpec extends FilterSpecBase<NumberFilterValue> {
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: "number"
  /** How the server stores the field: "int" holds whole numbers only, so values round. */
  server: "int" | "decimal"
  /** The unit the cell shows (`%`, `GB`, `days`). Values are entered and summarised in it. */
  unit?: string
  /** Stored value per display unit: `0.01` when the cell shows % of a stored fraction. */
  scale: number
  /** Lower allowed value. */
  min?: number
  /** Upper value or visible-item limit, as specified by the type. */
  max?: number
  /** Increment used by keyboard and stepper interaction. */
  step?: number
  /** Decimals in summaries (default: as entered, at most 2). */
  fractionDigits?: number
  operators: readonly NumberOp[]
}

export interface DateFilterSpec extends FilterSpecBase<DateFilterValue> {
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: "date"
  storage: DateStorage
  /** Presets offered first in the editor, in order. */
  presets: readonly DatePresetValue[]
  /** Ranges and emptiness offered after the presets. */
  operators: readonly (DateRangeOp | EmptyOp)[]
}

export interface BooleanFilterSpec extends FilterSpecBase<BooleanFilterValue> {
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: "boolean"
  /** The column's own words: `{ true: "Online", false: "Offline" }`. */
  labels: { true: string; false: string; empty?: string }
}

/** One choice in an options filter. Values are strings in the URL and the editor. */
export type FilterOption = Pick<OptionItem, "value" | "label" | "icon" | "description">

export interface OptionsFilterSpec extends FilterSpecBase<OptionsFilterValue> {
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: "options"
  /** The filter type behind the field. DecimalFilter has no lists, so `in` becomes `Or` of `Eq`. */
  server: "string" | "int" | "uuid" | "decimal"
  /** A closed set, known up front. */
  options?: readonly FilterOption[]
  /** An open-ended set loaded from the server (searched with "" for the full list). */
  source?: OptionSource
  /** Label for a value when the options are not loaded (chips, the context menu). */
  labelOf?: (value: string) => string
  operators: readonly OptionsOp[]
}

export interface UuidFilterSpec extends FilterSpecBase<UuidFilterValue> {
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: "uuid"
  operators: readonly UuidOp[]
  /** Name an id for chips ("Northstar Studio", not its UUID). */
  labelOf?: (value: string) => string
  placeholder?: string
}

/** The props every editor receives. Custom columns implement their own. */
export interface FilterEditorProps<V> {
  /** The applied value, or undefined when the column is not filtered. */
  value: V | undefined
  /** Apply a value; undefined removes the filter. */
  onChange: (value: V | undefined) => void
  /** Apply (when given) and close the editor: Enter in a field. */
  onCommit: (value?: V | undefined) => void
  /** Names the editor's controls ("Operating system"). */
  label: string
}

export interface CustomFilterSpec<V = unknown> {
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: "custom"
  field?: string
  label?: string
  nullable?: boolean
  editor: ComponentType<FilterEditorProps<V>>
  /** The chip text: "Patch level: behind by 2+". `label` is the column's filter label. */
  summary: (value: V, label: string) => string
  encode: (value: V) => string
  /** Validate and decode a URL value; null drops it. */
  decode: (raw: string) => V | null
  toWhere: (value: V, context: FilterTimeContext) => WhereInput | null
  /** The same semantics as the server, for fully loaded local data. */
  matches?: (cellValue: unknown, value: V, context: FilterTimeContext) => boolean
}

export type FilterSpec =
  | TextFilterSpec
  | NumberFilterSpec
  | DateFilterSpec
  | BooleanFilterSpec
  | OptionsFilterSpec
  | UuidFilterSpec
  // oxlint-disable-next-line typescript/no-explicit-any -- a custom column's value type is its own
  | CustomFilterSpec<any>

/** A column that cannot be narrowed, with the reason (R16.7). */
export interface NoFilter {
  none: string
}

export type ColumnFilterSetting = FilterSpec | NoFilter

export const isNoFilter = (setting: ColumnFilterSetting | undefined): setting is NoFilter =>
  Boolean(setting && typeof setting === "object" && "none" in setting)

/** A filterable column, as the filter code sees it. */
export interface FilterColumn {
  id: string
  /** The column header; the default filter label. */
  header: string
  /** Typed rendering or field specification. */
  spec: FilterSpec
  /** Read the row's value for local matching and "Only this value". */
  getValue?: (row: never) => unknown
}

export const filterLabel = (column: Pick<FilterColumn, "header" | "spec">) => column.spec.label ?? column.header
