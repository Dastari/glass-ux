import {
  createColumnHelper,
  type AccessorFn,
  type CellContext,
  type ColumnDef,
  type DeepKeys,
  type DeepValue,
  type RowData,
} from "@tanstack/react-table"
import type { ReactNode } from "react"
import type { CardRole, CellSkeleton, ColumnAlign, DataColumnMeta, DataTableFeatures } from "./features.js"
import { isNoFilter, type ColumnFilterSetting } from "./filters/types.js"

export type ColumnPriority = 1 | 2 | 3 | 4 | 5

/**
 * A Glass UX column: a TanStack v9 column definition plus the metadata the table needs to
 * lay itself out against its container. Widths are rem.
 */
export interface DataColumnSpec<T extends RowData, V = unknown> {
  id?: string
  /** Column name. Also labels the field in cards, the "+N" detail and menus. */
  header: string
  /** Cell renderer. Return a string for plain text (it truncates with an ellipsis). */
  cell?: (context: CellContext<DataTableFeatures, T, V>) => ReactNode
  /** 1 = never hide … 5 = hide first when the container narrows (default 3). */
  priority?: ColumnPriority
  /** Preferred width in rem (default 10). */
  width?: number
  /** Narrowest the column may shrink to before it hides (default 80% of width). */
  minWidth?: number
  /** Widest the column may grow to when there is spare room (default 250% of width). */
  maxWidth?: number
  /** Alignment of the overlay relative to its anchor. */
  align?: ColumnAlign
  /** Pin to the start edge. Pinned columns never hide and never shrink. */
  pin?: boolean
  /** "ellipsis" (default) or "wrap" to at most two lines. */
  truncate?: "ellipsis" | "wrap"
  /** Role in the card list (default: meta for priority ≤ 3, otherwise hidden). */
  cardRole?: CardRole
  /** The server can sort by this column. Shift-click adds it to a multi-sort. */
  sortable?: boolean
  /** Sort descending on the first click (times, numbers). */
  sortDescFirst?: boolean
  /** Take a share of spare width (default true). */
  grow?: boolean
  /** Flash when a live update changes the value (default true). */
  flash?: boolean
  /** Allow hiding from the column menu (default true, except pinned columns). */
  hideable?: boolean
  /** Placeholder shape while loading (default text; number for end-aligned columns). */
  skeleton?: CellSkeleton
  /**
   * How the server filters this column (R16.7): `filters.options({ field: "Os", … })`, or
   * `{ none: "reason" }` when it truly cannot be narrowed. See docs/data-filters.md.
   */
  filter?: ColumnFilterSetting
}

export type DataTableColumn<T extends RowData> = ColumnDef<DataTableFeatures, T, any>

const round = (value: number) => Math.round(value * 100) / 100

export function resolveColumnMeta(spec: DataColumnSpec<never, never>): DataColumnMeta {
  const width = spec.width ?? 10
  const minWidth = Math.min(spec.minWidth ?? round(width * 0.8), width)
  const maxWidth = Math.max(spec.maxWidth ?? round(width * 2.5), width)
  const pin = Boolean(spec.pin)
  const priority = pin ? 1 : (spec.priority ?? 3)
  const align = spec.align ?? "start"
  return {
    label: spec.header,
    priority,
    width,
    minWidth,
    maxWidth,
    align,
    pin,
    truncate: spec.truncate ?? "ellipsis",
    cardRole: spec.cardRole ?? (priority <= 3 ? "meta" : "hidden"),
    grow: spec.grow ?? true,
    flash: spec.flash ?? true,
    hideable: spec.hideable ?? !pin,
    skeleton: spec.skeleton ?? (align === "end" ? "number" : "text"),
    plain: !spec.cell,
    filter: spec.filter && !isNoFilter(spec.filter) ? spec.filter : null,
    ...(isNoFilter(spec.filter) ? { noFilter: spec.filter.none } : {}),
  }
}

function toDefinition(spec: DataColumnSpec<never, never>) {
  const meta = resolveColumnMeta(spec)
  return {
    ...(spec.id ? { id: spec.id } : {}),
    header: spec.header,
    ...(spec.cell ? { cell: spec.cell } : {}),
    size: meta.width,
    minSize: meta.minWidth,
    maxSize: meta.maxWidth,
    enableSorting: Boolean(spec.sortable),
    enableColumnFilter: Boolean(meta.filter),
    ...(spec.sortDescFirst !== undefined ? { sortDescFirst: spec.sortDescFirst } : {}),
    enableHiding: meta.hideable,
    meta,
  }
}

type AccessorValue<T extends RowData, TAccessor> =
  TAccessor extends AccessorFn<T, infer TReturn> ? TReturn : TAccessor extends DeepKeys<T> ? DeepValue<T, TAccessor> : never

/**
 * Column helper bound to the DataTable feature set. Keep the result at module scope (or
 * memoised) so the table's column model stays stable.
 *
 *   const col = createDataTableColumns<Endpoint>()
 *   export const columns = col.columns([
 *     col.accessor("name", { header: "Endpoint", pin: true, width: 16, cardRole: "title", sortable: true }),
 *     col.accessor("lastSeen", { header: "Last seen", priority: 2, width: 8, sortable: true, sortDescFirst: true }),
 *   ])
 */
export function createDataTableColumns<T extends RowData>() {
  const helper = createColumnHelper<DataTableFeatures, T>()
  return {
    accessor<TAccessor extends AccessorFn<T> | DeepKeys<T>, TValue extends AccessorValue<T, TAccessor>>(
      accessor: TAccessor,
      spec: DataColumnSpec<T, TValue>
    ): ColumnDef<DataTableFeatures, T, TValue> {
      return helper.accessor(accessor as never, toDefinition(spec as unknown as DataColumnSpec<never, never>) as never) as never
    },
    /** A column without an accessor (computed content). Needs an id. */
    display(spec: DataColumnSpec<T, unknown> & { id: string }): ColumnDef<DataTableFeatures, T, unknown> {
      return helper.display(toDefinition(spec as unknown as DataColumnSpec<never, never>) as never) as never
    },
    columns: helper.columns,
  }
}

/**
 * A column's id as TanStack resolves it: the explicit id, else the accessor key (dots
 * become underscores), else a string header.
 */
export function columnIdOf(def: { id?: string; accessorKey?: unknown; header?: unknown }): string {
  if (def.id) return def.id
  if (def.accessorKey !== undefined) return String(def.accessorKey).replaceAll(".", "_")
  return typeof def.header === "string" ? def.header : ""
}

/** Resolved metadata for a TanStack column (defaults applied even for raw definitions). */
export function metaOf(column: { columnDef: { meta?: DataColumnMeta; header?: unknown }; id: string }): DataColumnMeta {
  return (
    column.columnDef.meta ??
    resolveColumnMeta({ header: typeof column.columnDef.header === "string" ? column.columnDef.header : column.id })
  )
}
