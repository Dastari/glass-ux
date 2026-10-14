/**
 * Table state in the URL (R6.2, R16.1): sorting, filters, page and page size live in
 * search params so Back/Forward work and a view can be shared. Defaults are omitted, so a
 * fresh table has a clean URL. Parsing validates everything: unknown sort columns, pages
 * below one, page sizes that are not offered and filters a column cannot decode fall back
 * to defaults.
 *
 *   ?sort=lastSeen.desc,name&f.os=in:Windows 11 Pro,macOS 15&f.lastSeen=recent:7&page=3&size=50
 *
 * Each filter is `f.<columnId>`, encoded by the column's filter kind (filters/codec.ts). The
 * toolbar search (R16.8) is `q=orb-7`, trimmed, omitted when empty. With a `prefix` ("ep")
 * the keys become ep.sort / ep.q / ep.f.os / ep.page / ep.size, so two tables can share one
 * route.
 *
 * A grouped table (`grouped: true`) adds its group state: `collapsed=printer,voip-phone` and
 * `shown=endpoint:50` (a group's "Show more"). Both are view state: they carry when the
 * scope or the item changes, like the sort.
 */
import type { ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table"
import type { DataTableColumn } from "./columns.js"
import { decodeFilter, encodeFilter } from "./filters/codec.js"
import { asFilterColumns } from "./filters/columns.js"
import type { FilterColumn } from "./filters/types.js"
import { decodeCollapsed, decodeShown, encodeCollapsed, encodeShown, type DataTableGroupState } from "./grouping.js"
import { normalizeSearch } from "./search/types.js"

export interface TableUrlConfig {
  /** Column ids the server can sort by. Anything else in the URL is dropped. */
  sortable: readonly string[]
  /** Page-size choices offered by pagination. */
  pageSizes: readonly number[]
  defaultPageSize: number
  defaultSorting?: SortingState
  /**
   * The table's columns (module-level). Each column with a `filter` reads and writes its
   * own `f.<columnId>` param; filters on other columns are dropped.
   */
  // oxlint-disable-next-line typescript/no-explicit-any -- any row type: only the filter specs are read
  columns?: readonly DataTableColumn<any>[] | readonly FilterColumn[]
  /** Filters applied when the URL has none (written as `f.<id>=` once removed). */
  defaultFilters?: ColumnFiltersState
  /** Namespace the keys when a route holds more than one table. */
  prefix?: string
  /** The table groups its rows: read and write `collapsed` and `shown`. */
  grouped?: boolean
}

export interface TableUrlState {
  sorting: SortingState
  pagination: PaginationState
  filters: ColumnFiltersState
  /** The toolbar search query (`q`), "" when there is none. */
  search: string
  /** Grouped tables only. */
  groups?: DataTableGroupState
}

export type TableSearch = Record<string, unknown>

export function searchKeys(prefix?: string) {
  const key = (name: string) => (prefix ? `${prefix}.${name}` : name)
  return {
    sort: key("sort"),
    search: key("q"),
    page: key("page"),
    size: key("size"),
    collapsed: key("collapsed"),
    shown: key("shown"),
    filter: (columnId: string) => key(`f.${columnId}`),
    filterPrefix: key("f."),
  }
}

export function encodeSorting(sorting: SortingState) {
  return sorting.map((sort) => (sort.desc ? `${sort.id}.desc` : sort.id)).join(",")
}

export function decodeSorting(value: unknown, sortable: readonly string[]): SortingState | null {
  if (typeof value !== "string") return null
  const seen = new Set<string>()
  const sorting: SortingState = []
  for (const part of value.split(",")) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const desc = trimmed.endsWith(".desc")
    const asc = trimmed.endsWith(".asc")
    const id = desc ? trimmed.slice(0, -5) : asc ? trimmed.slice(0, -4) : trimmed
    if (!sortable.includes(id) || seen.has(id)) continue
    seen.add(id)
    sorting.push({ id, desc })
  }
  return sorting
}

function positiveInt(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN
  return Number.isInteger(number) && number >= 1 ? number : null
}

function sameSorting(a: SortingState, b: SortingState) {
  return a.length === b.length && a.every((sort, index) => sort.id === b[index]?.id && sort.desc === b[index]?.desc)
}

/** Read and validate the filters: one `f.<columnId>` param per filterable column. */
export function parseFilters(search: TableSearch, config: Pick<TableUrlConfig, "columns" | "defaultFilters" | "prefix">): ColumnFiltersState {
  const keys = searchKeys(config.prefix)
  const columns = asFilterColumns(config.columns ?? [])
  const defaults = new Map((config.defaultFilters ?? []).map((filter) => [filter.id, filter.value]))
  return columns.flatMap((column) => {
    const key = keys.filter(column.id)
    if (!(key in search)) return defaults.has(column.id) ? [{ id: column.id, value: defaults.get(column.id) }] : []
    const value = decodeFilter(column.spec, search[key])
    return value === null ? [] : [{ id: column.id, value }]
  })
}

/** Read and validate table state from a search object. */
export function parseTableSearch(search: TableSearch, config: TableUrlConfig): TableUrlState {
  const keys = searchKeys(config.prefix)
  const sorting = decodeSorting(search[keys.sort], config.sortable) ?? config.defaultSorting ?? []
  const size = positiveInt(search[keys.size])
  const pageSize = size !== null && config.pageSizes.includes(size) ? size : config.defaultPageSize
  const page = positiveInt(search[keys.page]) ?? 1
  const state: TableUrlState = {
    sorting,
    pagination: { pageIndex: page - 1, pageSize },
    filters: parseFilters(search, config),
    search: normalizeSearch(search[keys.search]),
  }
  if (config.grouped) state.groups = { collapsed: decodeCollapsed(search[keys.collapsed]), shown: decodeShown(search[keys.shown]) }
  return state
}

/** The filter params for a state: one key per filterable column, undefined when unset. */
export function serializeFilters(
  filters: ColumnFiltersState,
  config: Pick<TableUrlConfig, "columns" | "defaultFilters" | "prefix">
): Record<string, string | boolean | undefined> {
  const keys = searchKeys(config.prefix)
  const columns = asFilterColumns(config.columns ?? [])
  const current = new Map(filters.map((filter) => [filter.id, filter.value]))
  const defaults = new Map((config.defaultFilters ?? []).map((filter) => [filter.id, filter.value]))
  const out: Record<string, string | boolean | undefined> = {}
  for (const column of columns) {
    const encoded = current.has(column.id) ? encodeFilter(column.spec, current.get(column.id)) : undefined
    const fallback = defaults.has(column.id) ? encodeFilter(column.spec, defaults.get(column.id)) : undefined
    // Omit the default; a removed default is written empty so it stays removed. Yes/no go
    // in as booleans so the router writes `true`, not `"true"`.
    const value = encoded === fallback ? undefined : (encoded ?? "")
    out[keys.filter(column.id)] = value === "true" ? true : value === "false" ? false : value
  }
  return out
}

/**
 * The search params for a state, with defaults removed (`undefined` deletes the key when
 * merged into the router's search).
 */
export function serializeTableSearch(
  state: Omit<TableUrlState, "filters" | "search"> & { filters?: ColumnFiltersState; search?: string },
  config: TableUrlConfig
): Record<string, string | number | boolean | undefined> {
  const keys = searchKeys(config.prefix)
  const defaultSorting = config.defaultSorting ?? []
  const sortingIsDefault = sameSorting(state.sorting, defaultSorting)
  return {
    // An empty sort that differs from a non-empty default is written as "" so it survives.
    [keys.sort]: sortingIsDefault ? undefined : encodeSorting(state.sorting),
    [keys.search]: normalizeSearch(state.search) || undefined,
    ...(config.columns ? serializeFilters(state.filters ?? [], config) : {}),
    [keys.page]: state.pagination.pageIndex > 0 ? state.pagination.pageIndex + 1 : undefined,
    [keys.size]: state.pagination.pageSize !== config.defaultPageSize ? state.pagination.pageSize : undefined,
    ...(config.grouped
      ? { [keys.collapsed]: encodeCollapsed(state.groups?.collapsed ?? []), [keys.shown]: encodeShown(state.groups?.shown ?? {}) }
      : {}),
  }
}
