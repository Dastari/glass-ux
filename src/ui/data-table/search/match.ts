/**
 * The search's fields, resolved against a column set, and local matching for fully loaded
 * lists with the server's semantics: a case-insensitive `Contains` on any field, and an empty
 * value (null, undefined) never matches. Server adapters test their translation against it
 * (`src/adapters/graphql-orm/parity.test.ts`).
 */
import type { RowData } from "@tanstack/react-table"
import type { DataTableColumn } from "../columns.js"
import { asFilterColumns } from "../filters/columns.js"
import type { FilterColumn } from "../filters/types.js"
import { normalizeSearch, type DataTableSearch } from "./types.js"

export interface ResolvedSearchField<T> {
  /** The `Where` key. */
  field: string
  /** The row's value, when the column (or the ref) can read it. */
  getValue?: (row: T) => unknown
}

// oxlint-disable-next-line typescript/no-explicit-any -- any row type: only the filter specs are read
type Columns = readonly DataTableColumn<any>[] | readonly FilterColumn[]

/** Each searched field's `Where` key and value reader, in the order the spec lists them. */
export function searchFields<T extends RowData>(spec: DataTableSearch<T>, columns: Columns = []): Array<ResolvedSearchField<T>> {
  const byId = new Map(asFilterColumns(columns).map((column) => [column.id, column]))
  const seen = new Set<string>()
  return spec.fields.flatMap((entry) => {
    let resolved: ResolvedSearchField<T> | null = null
    if (typeof entry === "string") {
      const column = byId.get(entry)
      const field = column && "field" in column.spec ? column.spec.field : undefined
      if (column && field) resolved = { field, getValue: column.getValue as ((row: T) => unknown) | undefined }
    } else {
      resolved = { field: entry.field, getValue: entry.value }
    }
    if (!resolved || seen.has(resolved.field)) return []
    seen.add(resolved.field)
    return [resolved]
  })
}

function text(value: unknown): string | null {
  if (value === null || value === undefined || (typeof value === "number" && Number.isNaN(value))) return null
  return typeof value === "string" ? value : String(value)
}

/** A matcher for one query, resolved once for a whole list. */
function matcher<T extends RowData>(query: unknown, spec: DataTableSearch<T>, columns: Columns): ((row: T) => boolean) | null {
  const needle = normalizeSearch(query)
  if (!needle) return null
  if (spec.matches) return (row) => spec.matches!(row, needle)
  const lower = needle.toLowerCase()
  const fields = searchFields(spec, columns).flatMap((entry) => (entry.getValue ? [entry.getValue] : []))
  return (row) =>
    fields.some((read) => {
      const value = text(read(row))
      return value !== null && value.toLowerCase().includes(lower)
    })
}

/** Does a row match the query? An empty query matches every row. */
export function matchesSearch<T extends RowData>(row: T, query: unknown, spec: DataTableSearch<T>, columns: Columns = []): boolean {
  const match = matcher(query, spec, columns)
  return match ? match(row) : true
}

/**
 * Search a fully loaded, never-paged list in the browser, as the server would. Combine it
 * with `filterRows` (both must hold). Never use it on one page of a paged result.
 */
export function searchRows<T extends RowData>(rows: readonly T[], query: unknown, spec: DataTableSearch<T> | undefined, columns: Columns = []): T[] {
  const match = spec ? matcher(query, spec, columns) : null
  return match ? rows.filter(match) : rows.slice()
}
