import type { RowData } from "@tanstack/react-table"
import { columnIdOf, type DataTableColumn } from "../columns.js"
import type { DataColumnMeta } from "../features.js"
import type { FilterColumn } from "./types.js"

interface RawColumn {
  id?: string
  accessorKey?: unknown
  accessorFn?: (row: never, index: number) => unknown
  header?: unknown
  /** Supporting data displayed with the item. */
  meta?: DataColumnMeta
}

function readKey(row: unknown, key: string) {
  return key.split(".").reduce<unknown>((value, part) => (value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined), row)
}

/**
 * The filterable columns of a column set: id, header, filter spec and a value reader (the
 * column's accessor). Pass a module-level column set; the result is cached per array.
 */
export function filterColumns<T extends RowData>(columns: readonly DataTableColumn<T>[]): Array<FilterColumn & { getValue: (row: T) => unknown }> {
  const cached = cache.get(columns)
  if (cached) return cached as Array<FilterColumn & { getValue: (row: T) => unknown }>
  const result = (columns as readonly RawColumn[]).flatMap((def) => {
    const spec = def.meta?.filter
    if (!spec) return []
    const id = columnIdOf(def)
    const accessorKey = typeof def.accessorKey === "string" ? def.accessorKey : undefined
    const getValue = (row: T) => (def.accessorFn ? def.accessorFn(row as never, 0) : accessorKey !== undefined ? readKey(row, accessorKey) : undefined)
    return [{ id, header: def.meta?.label ?? (typeof def.header === "string" ? def.header : id), spec, getValue }]
  })
  cache.set(columns, result)
  return result
}

const cache = new WeakMap<object, unknown>()

/** Accept either a column set or already-extracted filter columns. */
// oxlint-disable-next-line typescript/no-explicit-any -- any row type: only the filter specs are read
export function asFilterColumns(columns: readonly DataTableColumn<any>[] | readonly FilterColumn[]): FilterColumn[] {
  if (!columns.length) return []
  const first = columns[0] as Partial<FilterColumn>
  return first.spec !== undefined && typeof first.header === "string" && "id" in first
    ? (columns as FilterColumn[])
    : // oxlint-disable-next-line typescript/no-explicit-any -- as above
      filterColumns(columns as readonly DataTableColumn<any>[])
}
