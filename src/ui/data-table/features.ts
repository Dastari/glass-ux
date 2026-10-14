import {
  columnFilteringFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  metaHelper,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table"
import type { FilterSpec } from "./filters/types.js"

/** How a column behaves in the card list below the table's minimum width. */
export type CardRole = "title" | "subtitle" | "status" | "meta" | "hidden"
export type ColumnAlign = "start" | "center" | "end"
/** The placeholder a column draws while the table loads (same boxes as the real cell). */
export type CellSkeleton = "text" | "identity" | "badge" | "number" | "sparkline" | "time" | "none"

/**
 * Glass UX column metadata, resolved with defaults by `createDataTableColumns`. Widths are rem
 * so columns scale with --ui-scale like everything else.
 */
export interface DataColumnMeta {
  /** Plain-text column name for menus, card labels and the "+N" detail. */
  label: string
  /** 1 = never hide … 5 = hide first. */
  priority: number
  /** Available width or named width tier. */
  width: number
  minWidth: number
  maxWidth: number
  /** Alignment of the overlay relative to its anchor. */
  align: ColumnAlign
  /** Pinned to the start edge by default (the identity column). */
  pin: boolean
  /** Single line with an ellipsis, or wrap to at most two lines. */
  truncate: "ellipsis" | "wrap"
  cardRole: CardRole
  /** May take a share of spare width. */
  grow: boolean
  /** Flash the cell when a live update changes its value. */
  flash: boolean
  /** Can be hidden from the column menu. */
  hideable: boolean
  skeleton: CellSkeleton
  /** No cell renderer: the value renders as truncating text. */
  plain: boolean
  /** How the column filters (R16.7), or null when it does not. */
  filter: FilterSpec | null
  /** Why the column has no filter (`filter: { none: "…" }`). */
  noFilter?: string
}

/**
 * The TanStack Table v9 features every DataTable registers. Sorting, filtering and
 * pagination are server-side (`manualSorting`, `manualFiltering`, `manualPagination`);
 * visibility, sizing and pinning are driven by the container (R16.2) and the column menu.
 */
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  columnSizingFeature,
  columnPinningFeature,
  columnMeta: metaHelper<DataColumnMeta>(),
})

export type DataTableFeatures = typeof dataTableFeatures
