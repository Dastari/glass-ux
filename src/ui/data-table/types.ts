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
   * filter returns to the first page. Map it to your server's query in an adapter.
   */
  filters: ColumnFiltersState;
  /**
   * The toolbar search query (R16.8), trimmed; "" or absent when there is none. It narrows
   * with the filters (both must hold) and, like them, returns to the first page. Send it
   * with the filters through the same server adapter.
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
  /** Called with no arguments when the person presses Next page (only while `hasNext`). */
  onNext: () => void;
  /** Called with no arguments when the person presses Previous page (only while `hasPrevious`). */
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
  /** Called with no arguments when the person presses Retry in the error state; the button shows only when this is set. */
  onRetry?: () => void;
  /**
   * One line for an empty result with nothing searched or filtered (R2.5), e.g. "No rows
   * yet". While searching or filtering the table says so itself, with the `noun` (`No rows
   * match "q3" and 2 filters`), and offers Clear search and Clear filters instead.
   */
  emptyMessage?: ReactNode;
  /** The primary action for the unfiltered empty state ("Add a row"). */
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
  /**
   * Row reordering by drag and keyboard (opt-in): a grip column before the checkboxes, also in
   * cards. The host owns the order and receives each move; see `DataTableReorder`.
   */
  reorder?: DataTableReorder<T>;
  /**
   * Accessible label for a row ("NST-C106"): selection, actions and the reorder grip and
   * announcements use it. Defaults to the first column's text.
   */
  getRowLabel?: (row: T) => string;

  /** Row density for this table. Uncontrolled tables persist the user's choice. */
  density?: DataTableDensity;
  /**
   * BCP 47 locale for this table's numbers, dates, counts and local sorting. Default: the
   * nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US.
   */
  locale?: string;
  /** Called with the density the person picks. Pair with `density` to control it; without `density` the table also stores the choice in its preferences. */
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

/**
 * One row move, reported once on release (R14: the drag itself renders nothing). The host owns
 * the order: apply it to its data (`move.rows`, or `moveRow(rows, move.from, move.to)`) and
 * pass the new `rows` back; persist it on the server as "put `rowId` after `previousId`".
 */
export interface DataTableRowMove<T> {
  /** The moved row. */
  row: T;
  /** Its id (`getRowId`). */
  rowId: string;
  /** Its index in `rows` before the move. */
  from: number;
  /** Its index in `rows` after the move. */
  to: number;
  /** The row now directly before it, or null when it moved to the start (of its group). */
  previousId: string | null;
  /** The row now directly after it, or null when it moved to the end (of its group). */
  nextId: string | null;
  /** `rows` with the move applied: pass it back as `rows` for local data. */
  rows: T[];
  /** With `reorder.withinGroups`: the group the row moved within. */
  group?: string;
  /** How the move was made. */
  source: "pointer" | "keyboard";
}

/**
 * Row reordering (opt-in): a grip in a leading column that drags (mouse, touch and pen) or
 * lifts with the keyboard (Space or Enter lifts and drops, ↑ ↓ Home End move, Escape cancels,
 * Alt+↑/↓ moves one place at once), with screen-reader announcements. The table shows the move
 * at once; when `onReorder` returns a promise the move stays on screen while it is pending and
 * is undone, with a toast, if it rejects.
 *
 * Reordering needs the visible order to be the manual order, so the grips are disabled, with
 * the reason as their tooltip (R11.3), while the table is sorted, searched or filtered, grouped
 * (unless `withinGroups`), shows one page of several (unless `withinPage`), holds live rows
 * behind "N new", or is saving the previous move. The order is the host's data: the table
 * persists none of it (column preferences are unaffected).
 */
export interface DataTableReorder<T> {
  /**
   * Called on drop with the move. Update `rows` in the same call for local data. Return a
   * promise to persist it: the move shows until the promise settles and is reverted when it
   * rejects (a rejection's `Error.message` is the toast's description).
   */
  onReorder: (move: DataTableRowMove<T>) => void | Promise<unknown>;
  /** Rows that may move (default: all). A locked row's grip is disabled; other rows can still pass it. */
  canReorder?: (row: T) => boolean;
  /** Why a row is locked: its grip's tooltip (default "This row is locked in place"). */
  lockedReason?: (row: T) => string;
  /** Turn reordering off without removing the grips: true, or the reason to show. */
  disabled?: boolean | string;
  /** Grouped tables: move rows within their own group instead of disabling reordering. */
  withinGroups?: boolean;
  /**
   * Paged tables: move rows within the current page instead of disabling reordering. The move's
   * neighbour ids place the row on the server; the indexes are this page's.
   */
  withinPage?: boolean;
  /**
   * Report a rejected move yourself. By default a danger toast names the row and the reason.
   * The move has already been reverted.
   */
  onError?: (error: unknown, move: DataTableRowMove<T>) => void;
}

/** An on/off filter that is not a column: "Show hidden" (). */
export interface DataTableFilterToggle {
  id: string;
  /** The menu row: "Show hidden". */
  label: string;
  /** Controlled checked state. The type specifies whether mixed state is supported. */
  checked: boolean;
  /** Called with the new state when the person toggles the menu row, and with `false` when they remove its chip or clear all filters. Pair with `checked`. */
  onCheckedChange: (checked: boolean) => void;
  /** The chip while on: "Including hidden". Without it, the toggle shows no chip. */
  summary?: string;
}
