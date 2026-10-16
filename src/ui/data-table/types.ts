import type { RowData } from "@tanstack/react-table";
import type {
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";
import type { ReactElement, ReactNode } from "react";
import type {
  ActionSet,
  ActionSurface,
  ResolvedAction,
} from "../../lib/actions/actions.js";
import type { DataTableColumn } from "./columns.js";
import type { DataTableGroupState, DataTableGrouping } from "./grouping.js";
import type { DataTableSearch } from "./search/types.js";

/** The table state that belongs to the caller (and normally to the URL). */
export interface DataTableState {
  /** Server-side sort order. Shift-click a header to add a column. */
  sorting: SortingState;
  /**
   * Server-side column filters (R16.7): TanStack's column filter state, one entry per
   * filtered column, each value in the shape of the column's filter kind. Changing a
   * filter returns to the first page. Turn it into a query with `toWhere` (graphql-orm).
   */
  filters: ColumnFiltersState;
  /**
   * The toolbar search query (R16.8), trimmed; "" or absent when there is none. It narrows
   * with the filters (both must hold) and, like them, returns to the first page. Turn it
   * into a query with `toWhere(filters, columns, { search: { query, spec } })`.
   */
  search?: string;
  /** Offset pagination: zero-based page index and page size. */
  pagination: PaginationState;
  /** Selected row ids. Survives paging and sorting. */
  selection: RowSelectionState;
  /**
   * Row grouping (with `grouping`): collapsed groups and each group's "Show more" count.
   * Sorting or filtering returns every group to its first page, as it returns a flat table
   * to page 1; collapsed groups stay collapsed. Absent: every group expanded, first page.
   */
  groups?: DataTableGroupState;
}

export type DataTableStateChange = keyof DataTableState;

export type DataTableDensity = "comfortable" | "compact";

/** Cursor pagination: the server returns next/previous cursors instead of a total. */
export interface CursorPagination {
  hasNext: boolean;
  hasPrevious: boolean;
  /** Called when next occurs. The callback type specifies its arguments. */
  onNext: () => void;
  /** Called when previous occurs. The callback type specifies its arguments. */
  onPrevious: () => void;
  /** Return to the first page (shown when provided). */
  onFirst?: () => void;
}

export interface DataTableNoun {
  one: string;
  other: string;
}

export interface DataTableProps<T extends RowData> {
  /** Stable id: persists column widths, hidden columns, pins and density per user. */
  id: string;
  /** Accessible name of the grid, e.g. "Endpoints". */
  label: string;
  /** The current page of rows, already sorted and paged by the server. */
  rows: readonly T[];
  /** Typed column definitions, including rendering, sorting, priorities and filters. */
  columns: readonly DataTableColumn<T>[];
  /**
   * Column ids initially folded into row/card details. Saved user choices take
   * precedence, including an explicitly empty hidden list. Reset columns restores
   * these defaults. Columns with hideable=false remain visible.
   */
  defaultHiddenColumns?: readonly string[];
  /** Returns a stable row identifier for selection, live updates and preferences. */
  getRowId: (row: T) => string;
  /** Total rows on the server (offset pagination). */
  rowCount?: number;
  /** Controlled slices. A slice left out is owned by the table. */
  state?: Partial<DataTableState>;
  /** Initial uncontrolled view state. */
  defaultState?: Partial<DataTableState>;
  /** Called with the next full state and the slice that changed. */
  onStateChange?: (state: DataTableState, change: DataTableStateChange) => void;
  /** Switch the pager to cursor mode. */
  cursor?: CursorPagination;
  /** Page-size choices offered by pagination. */
  pageSizes?: readonly number[];
  /**
   * Identity of the query behind `rows` (scope, view, anything outside the table's state).
   * When it changes the rows are a new result; when it does not, changed rows are live
   * updates and flash. Sorting, the search, filters and the page are part of it already.
   */
  queryKey?: unknown;

  /** First load: skeleton rows in the final shape. */
  loading?: boolean;
  /** A refetch is in flight: rows stay, a thin line runs under the header. */
  refetching?: boolean;
  /** Shown in the body box with Retry. A string should say what failed and what to do. */
  error?: ReactNode;
  /** Called when retry occurs. The callback type specifies its arguments. */
  onRetry?: () => void;
  /**
   * One line for an empty result with nothing searched or filtered (R2.5): "No endpoints
   * enrolled". While searching or filtering the table says so itself (`No devices match
   * "orb-7" and 2 filters`) and offers Clear search and Clear filters instead.
   */
  emptyMessage?: ReactNode;
  /** The primary action for the unfiltered empty state ("Enrol a device"). */
  emptyAction?: ReactNode;

  /** Show checkboxes and allow selection (default true). */
  selectable?: boolean;
  /**
   * The entity's actions (R12). The row ⋯ menu, the right-click menu and the bulk bar are
   * the shared action renderers reading this one definition, so they match ActionMenu,
   * ActionContextMenu and every other surface.
   */
  actions?: ActionSet<T>;
  /**
   * Run actions yourself. By default every surface uses the shared runner: confirm in an
   * AlertDialog, run, then report with a toast (R12.4, R12.5). With `onAction`, the
   * confirmation and the feedback are the caller's.
   */
  onAction?: (
    action: ResolvedAction<T>,
    targets: readonly T[],
    surface: ActionSurface,
  ) => void;
  /**
   * Per-row ActionSets, for rows of different kinds (a device list: an endpoint's set is not a
   * printer's). It replaces `actions`. One row's ⋯ and right-click resolve its own set, so
   * they match its header exactly. A selection of several kinds (right-click inside it, the
   * bulk bar) offers the actions every kind's set resolves, bulk in each, and each kind runs
   * its own definition against its own rows (`resolveRowActions`). Keep the sets stable: the
   * same object for every row of a kind.
   */
  getRowActions?: (row: T) => ActionSet<T> | undefined;
  /** Replace the ⋯ menu for a row (render your own trigger, e.g. a shared ActionMenu). */
  renderRowActions?: (row: T) => ReactNode;
  /**
   * Replace the context menu's content for a row (or the selection it belongs to). It is
   * placed inside the shared ContextMenu popup, so build it from Menu parts.
   */
  renderRowContextMenu?: (row: T, targets: T[]) => ReactNode;
  /** Wrap each row element (e.g. in the shared ActionContextMenu). Must render `children`. */
  rowWrapper?: (row: T, children: ReactElement) => ReactElement;
  /** Replace the bulk bar's action buttons. */
  renderBulkActions?: (rows: T[], clear: () => void) => ReactNode;
  /** Enter or double-click on a row. */
  onRowOpen?: (row: T) => void;
  /**
   * Group the rows (server-side, docs/data-filters.md §7): a header row per group with its
   * count from the server, which collapses (click, Enter or Space; ← and → on the header;
   * Alt-click toggles every group). Each expanded group shows its first `pageSize` rows and
   * a "Show more" line while the server has more; the pager gives way to a count. The
   * collapsed groups and "Show more" counts are the `groups` state slice (in the URL with
   * `useTableUrlState({ grouped: true })`). Pass `rows` in group order: each expanded
   * group's loaded rows, as `groupOf` assigns them.
   */
  grouping?: DataTableGrouping<T>;
  /** Accessible label for a row ("NST-C106"). Defaults to the first column's text. */
  getRowLabel?: (row: T) => string;

  /** Row density for this table. Uncontrolled tables persist the user's choice. */
  density?: DataTableDensity;
  /** Called when density change occurs. The callback type specifies its arguments. */
  onDensityChange?: (density: DataTableDensity) => void;
  /** "fill" (default) fills a parent with a definite height and scrolls inside. */
  height?: "fill" | "auto";
  /** Live data: flash changed cells and hold new rows behind an "N new" pill. */
  live?: boolean;
  /** When the data was last refreshed (status bar: "Updated 2 min ago"). */
  updatedAt?: Date | number;
  /** Noun for counts in the status bar ("1,284 endpoints"). */
  noun?: DataTableNoun;
  /**
   * The toolbar search (R16.8): a field at the start of the toolbar, beside Filters, that
   * matches these identifying fields on the server. Its query is the `search` state slice
   * (`q` in the URL with useTableUrlState). Typing waits 220 ms, then returns to the first
   * page. `/` focuses it while the table has focus. On a narrow toolbar it is an icon
   * button that opens the field, and an active query shows as a "Search: …" chip.
   */
  search?: DataTableSearch<T>;
  /** The table's own controls (a view switch, Refresh), at the end of the toolbar. */
  toolbar?: ReactNode;
  /**
   * On/off filters that are not a column ("Show hidden"): rows in the Filters menu, and a
   * chip while on. Clear filters turns them off too.
   */
  filterToggles?: readonly DataTableFilterToggle[];
  /** Extra status bar content (connection state, last sync). */
  status?: ReactNode;
  /** Below this width (rem) rows become cards (default 36). */
  cardBreakpoint?: number;
  className?: string;
}

/** An on/off filter that is not a column: "Show hidden" (). */
export interface DataTableFilterToggle {
  id: string;
  /** The menu row: "Show hidden". */
  label: string;
  /** Controlled checked state. The type specifies whether mixed state is supported. */
  checked: boolean;
  /** Called when checked change occurs. The callback type specifies its arguments. */
  onCheckedChange: (checked: boolean) => void;
  /** The chip while on: "Including hidden". Without it, the toggle shows no chip. */
  summary?: string;
}
